function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function makeChipList(items, tone) {
  if (!items?.length) {
    return '<div class="chip-list"><span class="chip soft">None detected</span></div>';
  }

  return `
    <div class="chip-list">
      ${items
        .map((item) => `<span class="chip ${tone}">${escapeHtml(item)}</span>`)
        .join("")}
    </div>
  `;
}

function makeBulletList(items, fallbackText) {
  if (!items?.length) {
    return `<p class="fallback-note">${escapeHtml(fallbackText)}</p>`;
  }

  return `
    <ul class="bullet-list">
      ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function renderLoadingMarkup(content, activeStep = 2) {
  const steps = [
    { title: "Document Parsing", desc: "Extracting text structure" },
    { title: "ATS Section Analysis", desc: "Checking skills, experience & format" },
    { title: "AI Model Evaluation", desc: "Running deep match scoring" },
    { title: "STAR Bullet Rewrites", desc: "Generating high-impact bullets" }
  ];

  const stepsHtml = steps
    .map((step, idx) => {
      const stepNum = idx + 1;
      let stateClass = "pending";
      if (stepNum < activeStep) stateClass = "completed";
      else if (stepNum === activeStep) stateClass = "active";

      return `
        <div class="stepper-item ${stateClass}">
          <div class="stepper-circle">${stepNum < activeStep ? "✓" : stepNum}</div>
          <div class="stepper-label">
            <strong>${escapeHtml(step.title)}</strong>
            <small>${escapeHtml(step.desc)}</small>
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="result-state loading-state">
      <div class="loading-header">
        <div class="spinner"></div>
        <div>
          <p class="state-kicker">AI Processing</p>
          <h3 style="margin:0;">Analyzing Resume...</h3>
        </div>
      </div>
      <p class="loading-subtext">${escapeHtml(content || "Parsing resume and running deep ATS analysis...")}</p>
      <div class="stepper-container">
        ${stepsHtml}
      </div>
    </div>
  `;
}

function renderErrorMarkup(message) {
  return `
    <div class="result-state error">
      <p class="state-kicker" style="color: #dc2626;">Error Encountered</p>
      <h3>Analysis could not be completed</h3>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function renderAtsChecklist(checklist) {
  if (!checklist?.length) {
    return "<p class='fallback-note'>No automated ATS checklist available for this run.</p>";
  }

  return `
    <div class="ats-checklist-grid">
      ${checklist
        .map(
          (item) => `
        <div class="ats-checklist-item ${item.passed ? "passed" : "flagged"}">
          <div class="checklist-badge">${item.passed ? "PASS" : "ACTION"}</div>
          <div class="checklist-content">
            <div class="checklist-name">${escapeHtml(item.check)}</div>
            <div class="checklist-detail">${escapeHtml(item.detail)}</div>
          </div>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

function renderBulletRewrites(rewrites) {
  if (!rewrites?.length) {
    return "<p class='fallback-note'>No bullet point rewrites detected.</p>";
  }

  return `
    <div class="rewrites-grid">
      ${rewrites
        .map(
          (item, idx) => `
        <div class="rewrite-card">
          <div class="rewrite-section original-box">
            <span class="rewrite-tag original-tag">Original Resume Line</span>
            <p class="rewrite-text">${escapeHtml(item.original)}</p>
          </div>
          <div class="rewrite-arrow">➔</div>
          <div class="rewrite-section improved-box">
            <div class="improved-header">
              <span class="rewrite-tag improved-tag">★ AI Optimized (STAR Framework)</span>
              <button type="button" class="copy-bullet-btn" data-target="rewrite-text-${idx}" title="Copy to clipboard">
                Copy
              </button>
            </div>
            <p class="rewrite-text highlight-text" id="rewrite-text-${idx}">${escapeHtml(item.improved)}</p>
            <div class="rewrite-reason">
              <strong>Why this works:</strong> ${escapeHtml(item.reason)}
            </div>
          </div>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

function renderAnalysisMarkup(payload) {
  if (!payload || !payload.analysis) {
    return `
      <div class="result-state">
        <p class="state-kicker">Result</p>
        <h3>Analysis completed</h3>
        <pre class="json-preview">${escapeHtml(JSON.stringify(payload, null, 2))}</pre>
      </div>
    `;
  }

  const analysis = payload.analysis;
  const score = analysis.score ?? 0;
  const method = analysis.method || "Resume Analysis";
  const isAi = Boolean(analysis.breakdown);

  let scoreTier = "Needs Work";
  let scoreClass = "score-low";
  if (score >= 78) {
    scoreTier = "Strong Match";
    scoreClass = "score-high";
  } else if (score >= 58) {
    scoreTier = "Moderate Match";
    scoreClass = "score-mid";
  }

  const scoreCards = isAi
    ? [
        ["Skills Fit", analysis.breakdown.skillsScore],
        ["Experience Depth", analysis.breakdown.experienceScore],
        ["Project Impact", analysis.breakdown.projectsScore],
        ["Education & Certs", analysis.breakdown.educationScore]
      ]
    : Object.entries(analysis.sectionScores || {}).map(([label, value]) => [
        label === "experience" ? "Experience Depth" :
        label === "skills" ? "Skills Fit" :
        label === "projects" ? "Project Impact" :
        label === "education" ? "Education & Certs" : label,
        value
      ]);

  const fallbackBanner = payload.fallbackNotice
    ? `
      <div class="fallback-banner">
        <span class="fallback-icon">ℹ️</span>
        <div>
          <strong>Local Fallback Active:</strong> ${escapeHtml(payload.fallbackNotice)}
        </div>
      </div>
    `
    : "";

  const metricsHtml = scoreCards.length
    ? `
      <div class="metrics-grid">
        ${scoreCards
          .map(
            ([label, val]) => `
          <div class="metric-card">
            <div class="metric-top">
              <span class="metric-name">${escapeHtml(label)}</span>
              <span class="metric-score-num">${escapeHtml(val)}<small>/100</small></span>
            </div>
            <div class="metric-bar-shell">
              <div class="metric-bar-fill" style="width: ${Math.min(100, Math.max(0, Number(val) || 0))}%;"></div>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `
    : "<p class='fallback-note'>No detailed metric breakdown available.</p>";

  return `
    ${fallbackBanner}
    <div class="result-hero ${scoreClass}">
      <div class="score-badge">
        <div class="score-badge-inner">
          <div class="score-value">${escapeHtml(score)}</div>
          <div class="score-label">ATS Score</div>
        </div>
      </div>

      <div class="hero-body">
        <div class="hero-header-row">
          <span class="tier-badge ${scoreClass}">${escapeHtml(scoreTier)}</span>
          <span class="method-badge">${escapeHtml(method)}</span>
        </div>
        <h2 class="hero-title">${escapeHtml(payload.resume?.name || "Uploaded Resume")}</h2>
        <p class="hero-summary">${escapeHtml(analysis.summary || "Analysis completed.")}</p>
        <div class="hero-meta">
          <span class="meta-pill">Size: ${Math.round((payload.resume?.size || 0) / 1024)} KB</span>
          <span class="meta-pill">Length: ${escapeHtml(payload.resume?.extractedTextLength || 0)} chars</span>
          <span class="meta-pill">${new Date(payload.receivedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </div>

    <!-- Quick Action Bar -->
    <div class="result-action-bar">
      <button type="button" id="inpage-print-btn" class="action-btn secondary">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Print / Save PDF
      </button>
      <button type="button" id="inpage-new-analysis-btn" class="action-btn primary">
        Analyze Another Resume
      </button>
    </div>

    <div class="result-grid">
      <!-- Section Scores -->
      <section class="result-card full-span">
        <div class="card-header">
          <p class="section-kicker">Dimensional Breakdown</p>
          <h3>Section Performance Scores</h3>
        </div>
        ${metricsHtml}
      </section>

      <!-- ATS Checklist -->
      <section class="result-card full-span">
        <div class="card-header">
          <p class="section-kicker">ATS Compliance</p>
          <h3>Automated ATS Readiness Audit</h3>
        </div>
        ${renderAtsChecklist(analysis.atsChecklist)}
      </section>

      <!-- AI Bullet Point Rewriter (STAR Method) -->
      <section class="result-card full-span">
        <div class="card-header">
          <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
            <div>
              <p class="section-kicker">AI Resume Optimizer</p>
              <h3>High-Impact Bullet Point Rewrites (STAR Method)</h3>
            </div>
            <span class="ai-pill">AI Powered</span>
          </div>
        </div>
        <p class="section-desc">
          Weak or unquantified resume statements transformed into high-impact accomplishment bullets with measurable outcomes:
        </p>
        ${renderBulletRewrites(analysis.bulletPointRewrites)}

        <!-- Interactive Single-Bullet Rewriter Tool -->
        <div class="custom-rewriter-container">
          <div class="custom-rewriter-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            <strong>Interactive Bullet Improver</strong> — Paste any sentence from your resume:
          </div>
          <div class="custom-rewriter-form">
            <input
              type="text"
              id="custom-bullet-input"
              class="custom-bullet-input"
              placeholder="e.g. Worked on database queries and helped frontend team with fixes"
            />
            <button type="button" id="custom-bullet-btn" class="custom-bullet-btn">
              Optimize with AI
            </button>
          </div>
          <div id="custom-bullet-result" class="custom-bullet-result hidden"></div>
        </div>
      </section>

      <!-- Skills Matched -->
      <section class="result-card">
        <p class="section-kicker">Skills Detected</p>
        <h3>Matched Job Keywords</h3>
        ${makeChipList(analysis.matchedKeywords, "good")}
        ${
          analysis.mustHaveMatches?.length
            ? `
              <p class="sub-label">Must-Have Matches</p>
              ${makeChipList(analysis.mustHaveMatches, "good")}
            `
            : ""
        }
      </section>

      <!-- Skills Missing -->
      <section class="result-card">
        <p class="section-kicker">Identified Gaps</p>
        <h3>Missing Key Competencies</h3>
        ${makeChipList(analysis.missingKeywords, "warn")}
        ${
          analysis.missingMustHaves?.length
            ? `
              <p class="sub-label">Missing Critical Must-Haves</p>
              ${makeChipList(analysis.missingMustHaves, "warn")}
            `
            : ""
        }
      </section>

      <!-- Strengths -->
      <section class="result-card">
        <p class="section-kicker">Standout Features</p>
        <h3>Candidate Strengths</h3>
        ${makeBulletList(analysis.strengths, "No specific strengths highlighted.")}
      </section>

      <!-- Weak Spots -->
      <section class="result-card">
        <p class="section-kicker">Critical Areas</p>
        <h3>Areas to Address</h3>
        ${makeBulletList(analysis.gaps, "No critical gaps identified.")}
      </section>

      <!-- Action Plan / Recommendations -->
      <section class="result-card full-span">
        <p class="section-kicker">Targeted Strategy</p>
        <h3>Recommended Action Plan</h3>
        ${
          isAi
            ? makeBulletList(
                analysis.improvementSuggestions,
                "No recommendations generated."
              )
            : makeBulletList(
                analysis.capsApplied?.length ? analysis.capsApplied : [
                  "Expand the experience section with specific technologies and metrics.",
                  "Align exact skill keywords from target job descriptions into your skills list.",
                  "Add quantifiable achievements (% latency reduction, users scaled, dollars saved)."
                ],
                "No constraints applied."
              )
        }
      </section>
    </div>
  `;
}

// Global copy-to-clipboard helper with visual feedback
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".copy-bullet-btn");
  if (!btn) return;

  const targetId = btn.getAttribute("data-target");
  const el = document.getElementById(targetId);
  if (!el) return;

  const textToCopy = el.textContent.trim();
  navigator.clipboard.writeText(textToCopy).then(() => {
    const originalText = btn.textContent;
    btn.textContent = "Copied! ✓";
    btn.classList.add("copied");
    setTimeout(() => {
      btn.textContent = originalText;
      btn.classList.remove("copied");
    }, 2000);
  });
});

// Interactive single-bullet rewriter handler
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("#custom-bullet-btn");
  if (!btn) return;

  const input = document.getElementById("custom-bullet-input");
  const resultDiv = document.getElementById("custom-bullet-result");
  if (!input || !resultDiv) return;

  const text = input.value.trim();
  if (!text) {
    input.focus();
    return;
  }

  btn.disabled = true;
  btn.textContent = "Optimizing...";
  resultDiv.classList.remove("hidden");
  resultDiv.innerHTML = "<div class='small-spinner'></div> Generating STAR optimization...";

  try {
    const res = await fetch("/api/rewrite-bullet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bulletText: text })
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Failed to optimize bullet.");

    resultDiv.innerHTML = `
      <div class="custom-rewritten-box">
        <div class="custom-variant">
          <div class="variant-label">
            <strong>1. Metric-Driven Variation (Impact Focused):</strong>
            <button type="button" class="copy-bullet-btn" data-target="custom-metric-text">Copy</button>
          </div>
          <p id="custom-metric-text" class="variant-text">${escapeHtml(data.metricDriven)}</p>
        </div>
        <div class="custom-variant" style="margin-top: 10px;">
          <div class="variant-label">
            <strong>2. Technical Leadership Variation (Architecture Focused):</strong>
            <button type="button" class="copy-bullet-btn" data-target="custom-lead-text">Copy</button>
          </div>
          <p id="custom-lead-text" class="variant-text">${escapeHtml(data.technicalLeadership)}</p>
        </div>
        <div class="custom-explanation">${escapeHtml(data.explanation || "")}</div>
      </div>
    `;
  } catch (err) {
    resultDiv.innerHTML = `<p class="inline-error">Optimization failed: ${escapeHtml(err.message)}</p>`;
  } finally {
    btn.disabled = false;
    btn.textContent = "Optimize with AI";
  }
});

window.AnalysisRenderer = {
  renderAnalysisMarkup,
  renderLoadingMarkup,
  renderErrorMarkup
};
