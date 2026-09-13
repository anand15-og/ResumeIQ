const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");
const pdfParse = require("pdf-parse");

loadEnvFile();

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const PYTHON_CANDIDATES = [
  process.env.RESUME_ANALYZER_PYTHON,
  "/opt/anaconda3/bin/python3",
  "python3",
  "/usr/bin/python3"
].filter(Boolean);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8"
};

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const envContents = fs.readFileSync(envPath, "utf8");
  const lines = envContents.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function serveStaticFile(req, res) {
  const requestUrl = new URL(req.url, "http://localhost");
  const requestedPath = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      if (error.code === "ENOENT") {
        sendJson(res, 404, { error: "Not found" });
        return;
      }

      sendJson(res, 500, { error: "Unable to read file" });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

function decodeTextFile(base64Content) {
  return Buffer.from(base64Content, "base64").toString("utf8").trim();
}

async function extractPdfText(base64Content) {
  try {
    const buffer = Buffer.from(base64Content, "base64");
    const data = await pdfParse(buffer);
    return data.text.trim();
  } catch (error) {
    throw new Error("Unable to parse PDF: " + error.message);
  }
}

async function parseResumeText(resumeFile) {
  const extension = path.extname(resumeFile.name || "").toLowerCase();
  const mimeType = String(resumeFile.type || "").toLowerCase();

  if (mimeType === "application/pdf" || extension === ".pdf") {
    return await extractPdfText(resumeFile.contentBase64);
  }

  if (mimeType === "text/plain" || extension === ".txt") {
    return decodeTextFile(resumeFile.contentBase64);
  }

  throw new Error("Only PDF and TXT resumes are supported right now.");
}

function analyzeResumeWithNltk(resumeText, jobDescription, enableTier1Booster) {
  let lastError = null;

  for (const pythonPath of PYTHON_CANDIDATES) {
    const result = spawnSync(
      pythonPath,
      [path.join(__dirname, "scripts", "analyze_resume.py")],
      {
        encoding: "utf8",
        input: JSON.stringify({
          resume_text: resumeText,
          job_description: jobDescription,
          enableTier1Booster
        })
      }
    );

    if (result.error) {
      lastError = result.error;
      continue;
    }

    if (result.status !== 0) {
      lastError = createHttpError(
        500,
        (result.stderr || "").trim() || "Local resume analysis failed."
      );
      continue;
    }

    try {
      return JSON.parse(result.stdout || "{}");
    } catch (error) {
      lastError = createHttpError(500, "Local analysis returned invalid JSON.");
    }
  }

  throw lastError || createHttpError(500, "Local resume analysis failed.");
}

function extractGeminiText(responseData) {
  const candidates = Array.isArray(responseData.candidates) ? responseData.candidates : [];

  for (const candidate of candidates) {
    const parts = Array.isArray(candidate.content?.parts) ? candidate.content.parts : [];
    for (const part of parts) {
      if (typeof part.text === "string" && part.text.trim()) {
        return part.text.trim();
      }
    }
  }

  return "";
}

async function analyzeResumeWithGemini(resumeText, jobDescription, enableTier1Booster) {
  if (!GEMINI_API_KEY) {
    throw createHttpError(
      500,
      "Set GEMINI_API_KEY in your environment or .env file to enable Gemini analysis."
    );
  }

  const prompt = `
Analyze this resume for an ATS and recruiter evaluation.

Scoring rules:
- Return an overall score from 0 to 100.
- If a job description is provided, score the resume against that specific role.
- If no job description is provided, act as an ATS simulator evaluating formatting standardness, keyword richness, section structure, and presentation clarity to provide a general ATS Readiness Score.
- Return concise, actionable, presentation-friendly explanations.
- Separate must-have skill matching from general keyword matching when a job description exists.
- Give concrete, high-value improvement suggestions for the candidate.
- Select 2 to 4 weak, vague, or passive bullet points directly from the resume and rewrite each into a high-impact version using the STAR framework (Strong Action Verb + Context/Tool + Measurable Metric/Result). Explain the reason for each rewrite.
- Evaluate the resume against 6 key ATS checklist criteria (Contact Details, Professional Links, Section Structure, Measurable Metrics, Action Verbs, Keyword Fit) with passed boolean and detail.
${enableTier1Booster ? "- If the candidate attended a Tier-1 University (e.g. IIT, NIT, IIIT, BITS), boost their education score slightly." : ""}
- Keep all arrays concise, realistic, and practical.

Resume:
${resumeText.slice(0, 12000)}

Job Description:
${jobDescription ? jobDescription.slice(0, 8000) : "No job description provided."}
  `.trim();

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      GEMINI_MODEL
    )}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseJsonSchema: {
            type: "object",
            additionalProperties: false,
            properties: {
              score: {
                type: "integer",
                minimum: 0,
                maximum: 100
              },
              breakdown: {
                type: "object",
                additionalProperties: false,
                properties: {
                  skillsScore: {
                    type: "integer",
                    minimum: 0,
                    maximum: 100
                  },
                  experienceScore: {
                    type: "integer",
                    minimum: 0,
                    maximum: 100
                  },
                  projectsScore: {
                    type: "integer",
                    minimum: 0,
                    maximum: 100
                  },
                  educationScore: {
                    type: "integer",
                    minimum: 0,
                    maximum: 100
                  }
                },
                required: [
                  "skillsScore",
                  "experienceScore",
                  "projectsScore",
                  "educationScore"
                ]
              },
              summary: {
                type: "string"
              },
              strengths: {
                type: "array",
                items: { type: "string" }
              },
              gaps: {
                type: "array",
                items: { type: "string" }
              },
              matchedKeywords: {
                type: "array",
                items: { type: "string" }
              },
              missingKeywords: {
                type: "array",
                items: { type: "string" }
              },
              mustHaveMatches: {
                type: "array",
                items: { type: "string" }
              },
              missingMustHaves: {
                type: "array",
                items: { type: "string" }
              },
              improvementSuggestions: {
                type: "array",
                items: { type: "string" }
              },
              bulletPointRewrites: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    original: { type: "string" },
                    improved: { type: "string" },
                    reason: { type: "string" }
                  },
                  required: ["original", "improved", "reason"]
                }
              },
              atsChecklist: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    check: { type: "string" },
                    passed: { type: "boolean" },
                    detail: { type: "string" }
                  },
                  required: ["check", "passed", "detail"]
                }
              }
            },
            required: [
              "score",
              "breakdown",
              "summary",
              "strengths",
              "gaps",
              "matchedKeywords",
              "missingKeywords",
              "mustHaveMatches",
              "missingMustHaves",
              "improvementSuggestions",
              "bulletPointRewrites",
              "atsChecklist"
            ]
          }
        }
      }),
      signal: AbortSignal.timeout(60000)
    }
  );

  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw createHttpError(
      502,
      responseData.error?.message || "Gemini request failed."
    );
  }

  const rawText = extractGeminiText(responseData);
  if (!rawText) {
    throw createHttpError(502, "Gemini did not return any analysis output.");
  }

  let analysis;

  try {
    analysis = JSON.parse(rawText);
  } catch (error) {
    throw createHttpError(502, "Gemini returned a response that was not valid JSON.");
  }

  return {
    score: analysis.score,
    breakdown: analysis.breakdown || {
      skillsScore: analysis.score,
      experienceScore: analysis.score,
      projectsScore: analysis.score,
      educationScore: analysis.score
    },
    summary: analysis.summary,
    strengths: Array.isArray(analysis.strengths) ? analysis.strengths : [],
    gaps: Array.isArray(analysis.gaps) ? analysis.gaps : [],
    matchedKeywords: Array.isArray(analysis.matchedKeywords)
      ? analysis.matchedKeywords
      : [],
    missingKeywords: Array.isArray(analysis.missingKeywords)
      ? analysis.missingKeywords
      : [],
    mustHaveMatches: Array.isArray(analysis.mustHaveMatches)
      ? analysis.mustHaveMatches
      : [],
    missingMustHaves: Array.isArray(analysis.missingMustHaves)
      ? analysis.missingMustHaves
      : [],
    improvementSuggestions: Array.isArray(analysis.improvementSuggestions)
      ? analysis.improvementSuggestions
      : [],
    bulletPointRewrites: Array.isArray(analysis.bulletPointRewrites)
      ? analysis.bulletPointRewrites
      : [],
    atsChecklist: Array.isArray(analysis.atsChecklist)
      ? analysis.atsChecklist
      : [],
    method: `Gemini API (${GEMINI_MODEL})`
  };
}

async function analyzeResumeWithGroq(resumeText, jobDescription, enableTier1Booster) {
  if (!GROQ_API_KEY) {
    throw createHttpError(
      500,
      "Set GROQ_API_KEY in your environment or .env file to enable Groq analysis."
    );
  }

  const prompt = `
Analyze this resume for an ATS and recruiter evaluation.

Scoring rules:
- Return an overall score from 0 to 100.
- If a job description is provided, score the resume against that specific role.
- If no job description is provided, act as an ATS simulator evaluating formatting standardness, keyword richness, section structure, and presentation clarity to provide a general ATS Readiness Score.
- Return concise, actionable, presentation-friendly explanations.
- Separate must-have skill matching from general keyword matching when a job description exists.
- Give concrete, high-value improvement suggestions for the candidate.
- Select 2 to 4 weak, vague, or passive bullet points directly from the resume and rewrite each into a high-impact version using the STAR framework (Strong Action Verb + Context/Tool + Measurable Metric/Result). Explain the reason for each rewrite.
- Evaluate the resume against 6 key ATS checklist criteria (Contact Details, Professional Links, Section Structure, Measurable Metrics, Action Verbs, Keyword Fit) with passed boolean and detail.
${enableTier1Booster ? "- If the candidate attended a Tier-1 University (e.g. IIT, NIT, IIIT, BITS), boost their education score slightly." : ""}
- Keep every array concise and practical.
- The output MUST match the requested JSON schema exactly.

JSON Schema:
{
  "score": integer,
  "breakdown": { "skillsScore": integer, "experienceScore": integer, "projectsScore": integer, "educationScore": integer },
  "summary": string,
  "strengths": [string],
  "gaps": [string],
  "matchedKeywords": [string],
  "missingKeywords": [string],
  "mustHaveMatches": [string],
  "missingMustHaves": [string],
  "improvementSuggestions": [string],
  "bulletPointRewrites": [
    { "original": string, "improved": string, "reason": string }
  ],
  "atsChecklist": [
    { "check": string, "passed": boolean, "detail": string }
  ]
}

Resume:
${resumeText.slice(0, 12000)}

Job Description:
${jobDescription ? jobDescription.slice(0, 8000) : "No job description provided."}
  `.trim();

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a JSON-only API. You must return a valid JSON object matching the requested schema exactly. Do not include markdown formatting."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    }),
    signal: AbortSignal.timeout(60000)
  });

  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw createHttpError(
      502,
      responseData.error?.message || "Groq request failed."
    );
  }

  const rawText = responseData.choices?.[0]?.message?.content?.trim() || "";
  if (!rawText) {
    throw createHttpError(502, "Groq did not return any analysis output.");
  }

  let analysis;
  try {
    analysis = JSON.parse(rawText);
  } catch (error) {
    throw createHttpError(502, "Groq returned a response that was not valid JSON.");
  }

  return {
    score: analysis.score || 0,
    breakdown: analysis.breakdown || {
      skillsScore: analysis.score,
      experienceScore: analysis.score,
      projectsScore: analysis.score,
      educationScore: analysis.score
    },
    summary: analysis.summary,
    strengths: Array.isArray(analysis.strengths) ? analysis.strengths : [],
    gaps: Array.isArray(analysis.gaps) ? analysis.gaps : [],
    matchedKeywords: Array.isArray(analysis.matchedKeywords)
      ? analysis.matchedKeywords
      : [],
    missingKeywords: Array.isArray(analysis.missingKeywords)
      ? analysis.missingKeywords
      : [],
    mustHaveMatches: Array.isArray(analysis.mustHaveMatches)
      ? analysis.mustHaveMatches
      : [],
    missingMustHaves: Array.isArray(analysis.missingMustHaves)
      ? analysis.missingMustHaves
      : [],
    improvementSuggestions: Array.isArray(analysis.improvementSuggestions)
      ? analysis.improvementSuggestions
      : [],
    bulletPointRewrites: Array.isArray(analysis.bulletPointRewrites)
      ? analysis.bulletPointRewrites
      : [],
    atsChecklist: Array.isArray(analysis.atsChecklist)
      ? analysis.atsChecklist
      : [],
    method: `Groq API (${GROQ_MODEL})`
  };
}

async function rewriteSingleBullet(bulletText, jobDescription = "", targetRole = "") {
  if (GEMINI_API_KEY) {
    try {
      const prompt = `
You are an executive tech resume coach and ATS optimization specialist.
Rewrite the following resume bullet point into two distinct, high-impact versions following the STAR method (Action Verb + Context/Tool + Measurable Outcome/Metric):
1. metricDriven: Prioritize quantifiable percentage, scale, or time-savings metrics.
2. technicalLeadership: Prioritize architectural ownership, tooling/stack, and team leadership.
Also provide a short explanation (1 sentence) describing why these improvements work better.

Target Role Context: ${targetRole || "Software Engineering / Tech Professional"}
Job Context: ${jobDescription ? jobDescription.slice(0, 1000) : "General Tech"}
Original Bullet: "${bulletText}"
      `.trim();

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          GEMINI_MODEL
        )}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              responseMimeType: "application/json",
              responseJsonSchema: {
                type: "object",
                properties: {
                  metricDriven: { type: "string" },
                  technicalLeadership: { type: "string" },
                  explanation: { type: "string" }
                },
                required: ["metricDriven", "technicalLeadership", "explanation"]
              }
            },
            signal: AbortSignal.timeout(20000)
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = extractGeminiText(data);
        if (text) {
          return JSON.parse(text);
        }
      }
    } catch (e) {
      console.warn("Gemini bullet rewrite failed, using heuristic:", e.message);
    }
  }

  // Pure algorithmic heuristic fallback
  const clean = bulletText.trim().replace(/^[\s•\-*—–]+\s*/, "").replace(/[.;]+$/, "");
  const firstLower = clean.length > 1 ? clean[0].toLowerCase() + clean.slice(1) : clean;
  return {
    metricDriven: `Architected and optimized ${firstLower}, delivering a 32% increase in system efficiency and reducing turnaround time by 4 hours weekly.`,
    technicalLeadership: `Spearheaded the technical design for ${firstLower}, collaborating cross-functionally and establishing automated testing best practices.`,
    explanation: "Converted passive phrasing into an active STAR-format bullet with quantifiable scale and leadership impact."
  };
}

function handleRewriteBullet(req, res) {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > 512 * 1024) req.destroy();
  });
  req.on("end", async () => {
    try {
      const parsed = JSON.parse(body || "{}");
      const { bulletText, jobDescription, targetRole } = parsed;
      if (!bulletText || !bulletText.trim()) {
        throw createHttpError(400, "bulletText is required.");
      }
      const result = await rewriteSingleBullet(bulletText.trim(), jobDescription, targetRole);
      sendJson(res, 200, result);
    } catch (error) {
      sendJson(res, error.statusCode || 500, { error: error.message || "Failed to rewrite bullet." });
    }
  });
}

function handleStatus(req, res) {
  sendJson(res, 200, {
    status: "ok",
    hasGemini: Boolean(GEMINI_API_KEY),
    geminiModel: GEMINI_MODEL,
    hasGroq: Boolean(GROQ_API_KEY),
    groqModel: GROQ_MODEL,
    hasLocalPython: true
  });
}

function handleAnalyze(req, res) {
  let body = "";

  req.on("data", (chunk) => {
    body += chunk;

    if (body.length > 8 * 1024 * 1024) {
      req.destroy();
    }
  });

  req.on("end", async () => {
    try {
      const parsed = JSON.parse(body || "{}");
      const { resumeFile, jobDescription, analysisMode, enableTier1Booster } = parsed;

      if (!resumeFile || !resumeFile.name || !resumeFile.contentBase64) {
        throw createHttpError(400, "Resume file is required.");
      }

      const extractedResumeText = await parseResumeText(resumeFile);
      const cleanedJobDescription = String(jobDescription || "").trim();

      if (!extractedResumeText) {
        throw createHttpError(400, "The uploaded resume did not contain extractable text.");
      }

      const selectedMode = ["gemini", "groq"].includes(analysisMode) ? analysisMode : "manual";
      let analysis;
      let fallbackNotice = null;

      if (selectedMode === "gemini") {
        if (!GEMINI_API_KEY) {
          analysis = analyzeResumeWithNltk(extractedResumeText, cleanedJobDescription, enableTier1Booster);
          fallbackNotice = "GEMINI_API_KEY is not configured in .env. Analysis was automatically performed using the Local Keyword Engine.";
        } else {
          try {
            analysis = await analyzeResumeWithGemini(extractedResumeText, cleanedJobDescription, enableTier1Booster);
          } catch (geminiError) {
            console.warn("Gemini call failed, falling back to local:", geminiError.message);
            analysis = analyzeResumeWithNltk(extractedResumeText, cleanedJobDescription, enableTier1Booster);
            fallbackNotice = `Gemini call failed (${geminiError.message}). Safely completed using the Local Keyword Engine.`;
          }
        }
      } else if (selectedMode === "groq") {
        if (!GROQ_API_KEY) {
          analysis = analyzeResumeWithNltk(extractedResumeText, cleanedJobDescription, enableTier1Booster);
          fallbackNotice = "GROQ_API_KEY is not configured in .env. Analysis was automatically performed using the Local Keyword Engine.";
        } else {
          try {
            analysis = await analyzeResumeWithGroq(extractedResumeText, cleanedJobDescription, enableTier1Booster);
          } catch (groqError) {
            console.warn("Groq call failed, falling back to local:", groqError.message);
            analysis = analyzeResumeWithNltk(extractedResumeText, cleanedJobDescription, enableTier1Booster);
            fallbackNotice = `Groq call failed (${groqError.message}). Safely completed using the Local Keyword Engine.`;
          }
        }
      } else {
        analysis = analyzeResumeWithNltk(extractedResumeText, cleanedJobDescription, enableTier1Booster);
      }

      const response = {
        message: "Resume analyzed successfully.",
        receivedAt: new Date().toISOString(),
        resume: {
          name: resumeFile.name,
          type: resumeFile.type || "unknown",
          size: resumeFile.size || 0,
          extractedTextLength: extractedResumeText.length,
          extractedTextPreview: extractedResumeText.slice(0, 400)
        },
        jobDescriptionPreview: cleanedJobDescription.slice(0, 160),
        analysisMode: selectedMode,
        fallbackNotice,
        analysis
      };

      sendJson(res, 200, response);
    } catch (error) {
      const statusCode = error.statusCode || 400;
      sendJson(res, statusCode, {
        error: error.message || "Invalid JSON payload."
      });
    }
  });
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/analyze") {
    handleAnalyze(req, res);
    return;
  }

  if (req.method === "POST" && req.url === "/api/rewrite-bullet") {
    handleRewriteBullet(req, res);
    return;
  }

  if (req.method === "GET" && req.url === "/api/status") {
    handleStatus(req, res);
    return;
  }

  if (req.method === "GET" || req.method === "HEAD") {
    serveStaticFile(req, res);
    return;
  }

  sendJson(res, 405, { error: "Method not allowed" });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
