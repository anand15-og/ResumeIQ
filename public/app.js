const form = document.getElementById("analyzer-form");
const resumeInput = document.getElementById("resume");
const dropzone = document.getElementById("dropzone");
const uploadedFile = document.getElementById("uploaded-file");
const uploadedFileName = document.getElementById("uploaded-file-name");
const changeFileButton = document.getElementById("change-file-button");
const analysisModeInput = document.getElementById("analysis-mode");
const jobDescriptionInput = document.getElementById("job-description");
const statusOutput = document.getElementById("status-output");
const submitButton = document.getElementById("submit-button");
const submitButtonText = document.getElementById("submit-button-text");
const statusChip = document.getElementById("status-chip");

const analyzerCard = document.getElementById("analyzer-card");
const inlineReportContainer = document.getElementById("inline-report-container");
const inlineReportOutput = document.getElementById("inline-report-output");
const returnToFormBtn = document.getElementById("return-to-form-btn");
const openStandaloneLink = document.getElementById("open-standalone-link");

// Preset virtual file storage
let activeVirtualFile = null;

const DEMO_PRESETS = {
  fullstack: {
    fileName: "Alex_Rivera_FullStack_Resume.txt",
    fileContent: `ALEX RIVERA
alex.rivera@example.com | (555) 234-5678 | github.com/arivera-dev | linkedin.com/in/alexrivera-tech
Austin, TX

PROFESSIONAL SUMMARY
Results-driven Full-Stack Software Engineer with 3+ years of experience building performant web applications and scalable RESTful APIs. Proficient in React, Node.js, TypeScript, PostgreSQL, and cloud infrastructure on AWS.

TECHNICAL SKILLS
Languages: JavaScript, TypeScript, Python, SQL, HTML5, CSS3
Frameworks & Libraries: React, Node.js, Express, Next.js, Redux, TailwindCSS
Databases & Cloud: PostgreSQL, MongoDB, Redis, AWS (S3, EC2, Lambda), Docker, Git, CI/CD

PROFESSIONAL EXPERIENCE
Software Engineer | Apex Cloud Solutions, Austin, TX | 2022 – Present
- Built and maintained customer-facing dashboard features in React and TypeScript for over 45,000 monthly active users.
- Developed backend microservices using Node.js, Express, and PostgreSQL, cutting API response times by 35%.
- Implemented Docker containerization and automated CI/CD pipeline deployments using GitHub Actions.
- Fixed database query bottlenecks, reducing p95 database load by 22% during peak sales events.

Junior Web Developer | Innovate Web Labs | 2021 – 2022
- Developed responsive landing pages and component libraries using React and TailwindCSS.
- Integrated third-party Stripe payment gateway and authentication flows with JWT.
- Participated in weekly code reviews and sprint planning within an Agile Scrum team.

PROJECTS
DevPulse – Developer Performance Metrics Tool | React, Node.js, GraphQL, PostgreSQL
- Created an open-source analytics dashboard tracking team GitHub PR cycle times with interactive charts.
- Implemented OAuth2 social authentication and role-based access control.

EDUCATION
Bachelor of Science in Computer Science | University of Texas at Austin | 2021`,
    jobDescription: `Job Title: Senior Full-Stack Engineer
Company: CloudScale Technologies
Location: Remote

About the Role:
We are seeking a high-caliber Full-Stack Engineer to architect and scale our core SaaS platform. You will build user-facing web applications in React and TypeScript while scaling high-throughput backend APIs with Node.js and PostgreSQL.

Requirements:
- 3+ years of professional full-stack web development experience.
- Strong proficiency in modern JavaScript, TypeScript, React, and Node.js.
- Demonstrated experience designing relational schemas in PostgreSQL or MySQL.
- Familiarity with containerization (Docker) and cloud deployments on AWS.
- Experience with microservices, CI/CD, and automated unit/integration testing.

Preferred Qualifications:
- Experience with Next.js, GraphQL, and Redis caching.
- Familiarity with Kubernetes or serverless architectures (AWS Lambda).`
  },
  data: {
    fileName: "Priya_Sharma_DataScientist_Resume.txt",
    fileContent: `PRIYA SHARMA
priya.sharma@example.com | (555) 876-5432 | github.com/psharma-data | linkedin.com/in/priyasharma-ds
Seattle, WA

PROFESSIONAL SUMMARY
Data Scientist with 3 years of hands-on experience in machine learning model development, exploratory data analysis, and predictive analytics. Skilled in Python, Scikit-Learn, PyTorch, SQL, and building end-to-end ML deployment pipelines.

TECHNICAL SKILLS
Languages: Python, SQL, R, Bash
Data & ML: Pandas, NumPy, Scikit-Learn, PyTorch, TensorFlow, SciPy, Matplotlib, Seaborn
Big Data & Cloud: Apache Spark, Snowflake, AWS (S3, SageMaker), Docker, MLflow, Git

PROFESSIONAL EXPERIENCE
Data Scientist | DataDrive Analytics, Seattle, WA | 2022 – Present
- Built customer churn prediction models using Scikit-Learn and XGBoost, improving retention by 18%.
- Processed and engineered features from over 12M customer transaction records using PySpark and Snowflake.
- Collaborated with engineering to deploy models via FastAPI microservices containerized in Docker.
- Designed A/B testing frameworks that evaluated pricing optimizations, driving $420K in incremental annual revenue.

Data Analyst | CoreMetrics Corp | 2021 – 2022
- Built automated executive Tableau dashboards tracking weekly KPI performance.
- Wrote complex SQL queries and window functions to extract customer cohort data.

PROJECTS
NeuralForecaster – Retail Demand Forecasting Engine | Python, PyTorch, FastAPI
- Trained LSTM recurrent neural networks to forecast store-level inventory requirements with 91% accuracy.

EDUCATION
Master of Science in Data Science | University of Washington | 2021`,
    jobDescription: `Job Title: Machine Learning Engineer / Senior Data Scientist
Company: DeepPulse AI
Location: Seattle, WA

Role Overview:
We are hiring a Machine Learning Engineer to take predictive models from research to production. You will work closely with product teams to build, evaluate, and monitor ML pipelines that process millions of real-time events.

Must-Have Requirements:
- 3+ years experience with Python, Pandas, Scikit-Learn, and SQL.
- Proven experience deploying machine learning models into production environments using Docker or FastAPI.
- Strong foundational understanding of statistical modeling, feature engineering, and classification algorithms.
- Experience tracking experiments using MLflow or Weights & Biases.

Nice-to-Have:
- Experience with deep learning frameworks (PyTorch or TensorFlow).
- Familiarity with AWS SageMaker, Snowflake, or Apache Spark.`
  },
  cloud: {
    fileName: "Jordan_Taylor_DevOps_Resume.txt",
    fileContent: `JORDAN TAYLOR
jordan.taylor@example.com | (555) 432-1098 | github.com/jtaylor-ops | linkedin.com/in/jordantaylor-cloud
Denver, CO

PROFESSIONAL SUMMARY
DevOps & Cloud Infrastructure Engineer with 4 years of experience specializing in Infrastructure as Code (IaC), Kubernetes container orchestration, and multi-region AWS cloud architectures.

TECHNICAL SKILLS
Cloud Providers: AWS (EKS, VPC, IAM, S3, RDS, CloudFront), Google Cloud Platform (GCP)
DevOps & IaC: Terraform, Ansible, Docker, Kubernetes, Helm, ArgoCD
CI/CD & Monitoring: GitHub Actions, Jenkins, Prometheus, Grafana, Datadog
Operating Systems & Scripting: Linux (Ubuntu, RHEL), Bash, Python, Go

PROFESSIONAL EXPERIENCE
Cloud DevOps Engineer | ScaleMatrix Systems, Denver, CO | 2022 – Present
- Managed multi-cluster Kubernetes (EKS) infrastructure supporting 120+ microservices in production.
- Automated 100% of cloud resource provisioning using Terraform and modular GitOps workflows with ArgoCD.
- Reduced monthly AWS infrastructure spend by 27% through spot instances and automated auto-scaling policies.
- Implemented comprehensive Prometheus & Grafana alerting dashboards, cutting incident mean time to detect (MTTD) by 45%.

DevOps Specialist | CloudNest Solutions | 2020 – 2022
- Maintained Jenkins and GitHub Actions CI/CD pipelines for 35 engineering teams.
- Hardened Linux server security standards, passing SOC2 compliance audits without deficiencies.

EDUCATION
Bachelor of Science in Computer Information Systems | Colorado State University | 2020`,
    jobDescription: `Job Title: Senior Cloud & Platform Engineer
Company: NextWave Media
Location: Denver, CO / Remote

Responsibilities:
We are looking for an experienced Cloud & DevOps Engineer to lead our platform reliability efforts. You will maintain our Kubernetes infrastructure, build GitOps pipelines, and ensure 99.99% system availability.

Key Qualifications:
- 3+ years experience managing production AWS environments and Kubernetes clusters (EKS).
- Expert knowledge of Terraform for Infrastructure as Code (IaC).
- Hands-on experience with CI/CD automation using GitHub Actions or GitLab CI.
- Strong Linux administration, networking (VPC, DNS, TLS), and Bash/Python scripting skills.
- Experience with Prometheus, Grafana, and Datadog monitoring.`
  }
};

function setStatus(content) {
  statusOutput.innerHTML = window.AnalysisRenderer.renderLoadingMarkup(content);
}

function setError(message) {
  statusOutput.innerHTML = window.AnalysisRenderer.renderErrorMarkup(message);
  statusChip.textContent = "Error";
  statusChip.className = "status-chip error";
}

function makeAnalysisKey(requestId) {
  return `resume-analysis:${requestId}`;
}

function showSelectedFile(name) {
  uploadedFileName.textContent = name;
  uploadedFile.classList.remove("hidden");
  dropzone.classList.add("hidden");
  statusChip.textContent = "File Ready";
  statusChip.className = "status-chip ready";
}

function resetSelectedFile() {
  resumeInput.value = "";
  activeVirtualFile = null;
  dropzone.classList.remove("hidden");
  uploadedFile.classList.add("hidden");
  uploadedFileName.textContent = "";
  statusChip.textContent = "Awaiting File";
  statusChip.className = "status-chip";
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const contentBase64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(contentBase64);
    };
    reader.onerror = () => reject(new Error("Unable to read the selected file."));
    reader.readAsDataURL(file);
  });
}

function stringToBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

// Preset button handlers
function loadPreset(key) {
  const preset = DEMO_PRESETS[key];
  if (!preset) return;

  activeVirtualFile = {
    name: preset.fileName,
    type: "text/plain",
    size: preset.fileContent.length,
    contentBase64: stringToBase64(preset.fileContent)
  };

  resumeInput.value = "";
  showSelectedFile(`${preset.fileName} (Demo Preset)`);
  jobDescriptionInput.value = preset.jobDescription;
  statusChip.textContent = "Preset Loaded";
  statusChip.className = "status-chip ready";
}

document.getElementById("preset-fullstack")?.addEventListener("click", () => loadPreset("fullstack"));
document.getElementById("preset-data")?.addEventListener("click", () => loadPreset("data"));
document.getElementById("preset-cloud")?.addEventListener("click", () => loadPreset("cloud"));
document.getElementById("preset-clear")?.addEventListener("click", () => {
  resetSelectedFile();
  jobDescriptionInput.value = "";
});

// Dropzone file selection
resumeInput.addEventListener("change", () => {
  const file = resumeInput.files?.[0];
  if (!file) return;
  activeVirtualFile = null;
  showSelectedFile(file.name);
});

dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("dragover");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragover");
});

dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("dragover");

  const file = event.dataTransfer?.files?.[0];
  if (file && (file.type === "application/pdf" || file.type === "text/plain" || file.name.toLowerCase().endsWith(".pdf") || file.name.toLowerCase().endsWith(".txt"))) {
    const dt = new DataTransfer();
    dt.items.add(file);
    resumeInput.files = dt.files;
    activeVirtualFile = null;
    showSelectedFile(file.name);
  } else if (file) {
    setError("Please drop a valid PDF or TXT resume file.");
  }
});

changeFileButton.addEventListener("click", resetSelectedFile);

// Form submission & Analysis flow
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const realFile = resumeInput.files?.[0];
  const analysisMode = analysisModeInput.value;
  const jobDescription = jobDescriptionInput.value.trim();
  const tier1BoosterInput = document.getElementById("tier1-booster");
  const enableTier1Booster = tier1BoosterInput ? tier1BoosterInput.checked : false;

  if (!realFile && !activeVirtualFile) {
    setError("Please upload a resume file or select a 1-click demo preset.");
    return;
  }

  const requestId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `analysis-${Date.now()}`;
  const storageKey = makeAnalysisKey(requestId);

  submitButton.disabled = true;
  submitButtonText.textContent = "Analyzing...";
  statusChip.textContent = "Processing";
  statusChip.className = "status-chip processing";

  // Animated stepper progression simulation
  let step = 1;
  statusOutput.innerHTML = window.AnalysisRenderer.renderLoadingMarkup(
    "Extracting text and tokenizing sections...",
    1
  );

  const stepTimer = setInterval(() => {
    step = Math.min(4, step + 1);
    const messages = [
      "Extracting text and tokenizing sections...",
      "Analyzing ATS keywords and section alignment...",
      "Executing AI model evaluation and scoring...",
      "Optimizing accomplishment bullets with STAR method..."
    ];
    statusOutput.innerHTML = window.AnalysisRenderer.renderLoadingMarkup(
      messages[step - 1],
      step
    );
  }, 1400);

  try {
    let resumePayload;
    if (activeVirtualFile) {
      resumePayload = activeVirtualFile;
    } else {
      const contentBase64 = await fileToBase64(realFile);
      resumePayload = {
        name: realFile.name,
        type: realFile.type,
        size: realFile.size,
        contentBase64
      };
    }

    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resumeFile: resumePayload,
        analysisMode,
        jobDescription,
        enableTier1Booster
      })
    });

    const payload = await response.json();
    clearInterval(stepTimer);

    if (!response.ok) {
      throw new Error(payload.error || "Analysis failed.");
    }

    // Persist result in both storage systems
    const savedRecord = { status: "success", payload };
    try {
      localStorage.setItem(storageKey, JSON.stringify(savedRecord));
      sessionStorage.setItem(storageKey, JSON.stringify(savedRecord));
    } catch (e) {
      console.warn("Storage quota limit:", e);
    }

    // Update status chip
    statusChip.textContent = `Score: ${payload.analysis?.score ?? "--"}/100`;
    statusChip.className = "status-chip completed";

    // Render in status dashboard preview
    statusOutput.innerHTML = `
      <div class="result-state success-preview">
        <p class="state-kicker">Benchmark Ready</p>
        <div class="preview-score-row">
          <div class="preview-score">${payload.analysis?.score ?? "--"}</div>
          <div>
            <h3>Analysis Complete!</h3>
            <p>${payload.analysis?.summary || "Full report generated successfully."}</p>
          </div>
        </div>
        <button type="button" id="view-full-report-btn" class="action-btn primary" style="margin-top:14px; width:100%;">
          View Full Interactive Report ↓
        </button>
      </div>
    `;

    // Render the complete report into the in-page container
    inlineReportOutput.innerHTML = window.AnalysisRenderer.renderAnalysisMarkup(payload);
    openStandaloneLink.href = `/result.html?analysis=${encodeURIComponent(requestId)}`;
    inlineReportContainer.classList.remove("hidden");

    // Scroll to the full report smoothly
    inlineReportContainer.scrollIntoView({ behavior: "smooth", block: "start" });

    document.getElementById("view-full-report-btn")?.addEventListener("click", () => {
      inlineReportContainer.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  } catch (error) {
    clearInterval(stepTimer);
    setError(error.message);
  } finally {
    submitButton.disabled = false;
    submitButtonText.textContent = "Analyze Resume";
  }
});

// In-page navigation listeners
returnToFormBtn?.addEventListener("click", () => {
  analyzerCard.scrollIntoView({ behavior: "smooth", block: "start" });
});

document.addEventListener("click", (e) => {
  if (e.target.closest("#inpage-print-btn")) {
    window.print();
  }
  if (e.target.closest("#inpage-new-analysis-btn")) {
    inlineReportContainer.classList.add("hidden");
    analyzerCard.scrollIntoView({ behavior: "smooth", block: "start" });
    resetSelectedFile();
  }
});
