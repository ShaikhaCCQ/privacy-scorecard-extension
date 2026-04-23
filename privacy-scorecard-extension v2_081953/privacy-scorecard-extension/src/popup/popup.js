/**
 * Popup Script
 * Requests privacy data from the background service worker
 * and renders the score, breakdown, and recommendations in the UI.
 */

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) {
      showError("Cannot analyze this page (browser internal page).");
      return;
    }

    document.getElementById("site-domain").textContent = new URL(tab.url).hostname;

    chrome.runtime.sendMessage(
      { type: "GET_PRIVACY_DATA", tabId: tab.id },
      (response) => {
        if (chrome.runtime.lastError || !response || response.error) {
          showError(response?.error || "Could not retrieve privacy data. Try reloading the page.");
          return;
        }
        renderResults(response);
      }
    );
  } catch (err) {
    showError("An error occurred while analyzing this page.");
  }
});

function renderResults(data) {
  renderScore(data.finalScore);
  renderBreakdown(data.ruleBasedScore.breakdown);
  renderMLAnalysis(data.mlAnalysis);
  renderRecommendations(data.recommendations);
  renderTrackers(data.features.trackerDomains);
}

function renderScore(finalScore) {
  const scoreValue = document.getElementById("score-value");
  const scoreGrade = document.getElementById("score-grade");
  const scoreCircle = document.getElementById("score-circle");
  const riskBadge = document.getElementById("risk-badge");

  const score = finalScore.score;
  const circumference = 2 * Math.PI * 52; // r=52
  const offset = circumference - (score / 100) * circumference;

  // Animate score number
  animateNumber(scoreValue, 0, score, 1000);

  // Show letter grade
  scoreGrade.textContent = finalScore.grade || "--";

  // Animate ring
  setTimeout(() => {
    scoreCircle.style.strokeDashoffset = offset;
  }, 100);

  // Color based on risk
  const colors = { low: "#00ba7c", medium: "#ffd400", high: "#f91880" };
  const color = colors[finalScore.riskLevel] || "#1d9bf0";
  scoreCircle.style.stroke = color;

  // Risk badge
  riskBadge.textContent = `${finalScore.riskLevel} risk`;
  riskBadge.className = `risk-badge risk-${finalScore.riskLevel}`;
}

function renderBreakdown(breakdown) {
  const container = document.getElementById("breakdown-list");
  container.innerHTML = "";

  const labels = {
    https: "HTTPS Security",
    trackers: "Trackers",
    cookies: "Cookies",
    fingerprinting: "Fingerprinting",
    permissions: "Permissions",
    thirdPartyRatio: "3rd Party Ratio",
  };

  for (const [key, data] of Object.entries(breakdown)) {
    const percentage = (data.score / data.max) * 100;
    const color = getBarColor(percentage);

    const item = document.createElement("div");
    item.className = "breakdown-item";
    item.title = data.detail;
    item.innerHTML = `
      <span class="breakdown-label">${labels[key] || key}</span>
      <div class="breakdown-bar-container">
        <div class="breakdown-bar" style="width: 0%; background: ${color};"></div>
      </div>
      <span class="breakdown-score">${data.score}/${data.max}</span>
    `;
    container.appendChild(item);

    // Animate bar
    setTimeout(() => {
      item.querySelector(".breakdown-bar").style.width = percentage + "%";
    }, 200);
  }
}

function renderMLAnalysis(ml) {
  const container = document.getElementById("ml-details");
  container.innerHTML = "";

  const chips = [
    { label: "Cluster", value: ml.riskCluster, color: getChipColor(ml.riskCluster) },
    { label: "Anomaly", value: ml.isAnomaly ? "Yes" : "No", color: ml.isAnomaly ? "#f91880" : "#00ba7c" },
    { label: "Anomaly Score", value: ml.anomalyScore.toFixed(2), color: ml.anomalyScore > 0.6 ? "#f91880" : "#71767b" },
    { label: "Noise Point", value: ml.isNoise ? "Yes" : "No", color: ml.isNoise ? "#ffd400" : "#71767b" },
  ];

  for (const chip of chips) {
    const el = document.createElement("div");
    el.className = "ml-chip";
    el.innerHTML = `
      <span class="ml-chip-label">${chip.label}:</span>
      <span class="ml-chip-value" style="color: ${chip.color}">${chip.value}</span>
    `;
    container.appendChild(el);
  }
}

function renderRecommendations(recommendations) {
  const container = document.getElementById("recommendations-list");
  container.innerHTML = "";

  for (const rec of recommendations) {
    const item = document.createElement("div");
    item.className = `rec-item rec-${rec.severity}`;
    item.innerHTML = `
      <div class="rec-message">${escapeHtml(rec.message)}</div>
      <div class="rec-action">${escapeHtml(rec.action)}</div>
    `;
    container.appendChild(item);
  }
}

function renderTrackers(trackerDomains) {
  if (!trackerDomains || trackerDomains.length === 0) return;

  const section = document.getElementById("trackers-section");
  const list = document.getElementById("tracker-list");
  section.style.display = "block";
  list.innerHTML = "";

  for (const domain of trackerDomains) {
    const li = document.createElement("li");
    li.textContent = domain;
    list.appendChild(li);
  }
}

function showError(message) {
  document.getElementById("score-value").textContent = "--";
  document.getElementById("score-grade").textContent = "--";
  document.getElementById("risk-badge").textContent = "N/A";
  document.getElementById("risk-badge").className = "risk-badge";
  document.getElementById("breakdown-list").innerHTML = `<div class="loading-placeholder">${escapeHtml(message)}</div>`;
  document.getElementById("ml-details").innerHTML = "";
  document.getElementById("recommendations-list").innerHTML = "";
}

// Utility functions

function animateNumber(element, start, end, duration) {
  const startTime = performance.now();
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    element.textContent = Math.round(start + (end - start) * eased);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function getBarColor(percentage) {
  if (percentage >= 75) return "#00ba7c";
  if (percentage >= 45) return "#ffd400";
  return "#f91880";
}

function getChipColor(riskLevel) {
  const colors = { low: "#00ba7c", medium: "#ffd400", high: "#f91880" };
  return colors[riskLevel] || "#71767b";
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
