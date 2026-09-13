const resultOutput = document.getElementById("result-page-output");
const params = new URLSearchParams(window.location.search);
const analysisId = params.get("analysis");

function getStorageKey(id) {
  return `resume-analysis:${id}`;
}

let pollInterval = null;

function renderStoredState() {
  if (!analysisId) {
    resultOutput.innerHTML = window.AnalysisRenderer.renderErrorMarkup(
      "No analysis id was provided for this page."
    );
    return;
  }

  const raw =
    localStorage.getItem(getStorageKey(analysisId)) ||
    sessionStorage.getItem(getStorageKey(analysisId));

  if (!raw) {
    resultOutput.innerHTML = window.AnalysisRenderer.renderLoadingMarkup(
      "Waiting for the analyzer to send this report..."
    );
    return;
  }

  let state;
  try {
    state = JSON.parse(raw);
  } catch (error) {
    resultOutput.innerHTML = window.AnalysisRenderer.renderErrorMarkup(
      "The saved analysis report could not be read."
    );
    return;
  }

  if (state.status === "loading") {
    resultOutput.innerHTML = window.AnalysisRenderer.renderLoadingMarkup(
      state.message || "Preparing your analysis report..."
    );
    return;
  }

  if (state.status === "error") {
    if (pollInterval) clearInterval(pollInterval);
    resultOutput.innerHTML = window.AnalysisRenderer.renderErrorMarkup(
      state.message || "The analysis did not complete."
    );
    return;
  }

  if (state.status === "success" && state.payload) {
    if (pollInterval) clearInterval(pollInterval);
    if (!state.payload.jobDescriptionPreview) {
      const titleEl = document.getElementById("report-title");
      if (titleEl) titleEl.textContent = "ATS Readiness Audit";
    }
    resultOutput.innerHTML = window.AnalysisRenderer.renderAnalysisMarkup(state.payload);
    return;
  }

  resultOutput.innerHTML = window.AnalysisRenderer.renderLoadingMarkup(
    "Waiting for the latest analysis state..."
  );
}

window.addEventListener("storage", (event) => {
  if (event.key === getStorageKey(analysisId)) {
    renderStoredState();
  }
});

renderStoredState();
pollInterval = setInterval(renderStoredState, 1000);

const downloadButton = document.getElementById("download-button");
if (downloadButton) {
  downloadButton.addEventListener("click", () => {
    window.print();
  });
}
