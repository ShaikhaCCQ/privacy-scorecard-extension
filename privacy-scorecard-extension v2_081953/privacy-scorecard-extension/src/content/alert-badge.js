/**
 * Auto-Alert: Full Privacy Panel
 * Automatically injects the complete Privacy Scorecard panel as a
 * slide-in sidebar on every website. Shows the full report including
 * score, breakdown, ML analysis, recommendations, and tracker list.
 */

(function () {
  "use strict";

  // Don't inject on extension pages or browser internals
  if (
    window.location.protocol === "chrome-extension:" ||
    window.location.protocol === "chrome:" ||
    window.location.protocol === "about:" ||
    window.location.protocol === "edge:"
  ) {
    return;
  }

  // Prevent double-injection
  if (document.getElementById("ps-privacy-panel")) return;

  // Check if user dismissed for this session
  try {
    if (sessionStorage.getItem("ps-panel-dismissed") === "1") return;
  } catch (e) {}

  // ── Create Shadow DOM host ──
  const host = document.createElement("div");
  host.id = "ps-privacy-panel";
  host.style.cssText = "all: initial; position: fixed; z-index: 2147483647; top: 0; right: 0; height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;";
  const shadow = host.attachShadow({ mode: "closed" });

  // ── Styles ──
  const style = document.createElement("style");
  style.textContent = `
    * { margin: 0; padding: 0; box-sizing: border-box; }

    /* Overlay backdrop */
    .panel-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.35);
      opacity: 0;
      transition: opacity 0.3s ease;
      z-index: 1;
    }
    .panel-overlay.visible { opacity: 1; }

    /* Sidebar Panel */
    .panel {
      position: fixed;
      top: 0;
      right: 0;
      width: 400px;
      height: 100vh;
      background: #0f1419;
      box-shadow: -4px 0 32px rgba(0,0,0,0.5);
      transform: translateX(100%);
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 2;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .panel.open { transform: translateX(0); }
    .panel.closing {
      transform: translateX(100%);
      transition: transform 0.3s ease-in;
    }

    @media (max-width: 500px) {
      .panel { width: 100vw; }
    }

    /* Header */
    .panel-header {
      display: flex;
      align-items: center;
      padding: 16px 18px;
      border-bottom: 1px solid #2f3336;
      gap: 12px;
      flex-shrink: 0;
    }

    .header-icon {
      width: 32px;
      height: 32px;
      flex-shrink: 0;
    }

    .header-text { flex: 1; }

    .header-title {
      font-size: 16px;
      font-weight: 700;
      color: #fff;
    }

    .header-domain {
      font-size: 11px;
      color: #71767b;
      word-break: break-all;
    }

    .header-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: rgba(255,255,255,0.06);
      color: #71767b;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    .header-btn:hover {
      background: rgba(255,255,255,0.12);
      color: #e7e9ea;
    }

    /* Scrollable body */
    .panel-body {
      flex: 1;
      overflow-y: auto;
      padding: 18px;
    }

    /* Score Section */
    .score-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 22px;
    }

    .score-ring {
      position: relative;
      width: 130px;
      height: 130px;
      margin-bottom: 12px;
    }

    .score-ring svg {
      transform: rotate(-90deg);
      width: 100%;
      height: 100%;
    }

    .score-bg { fill: none; stroke: #2f3336; stroke-width: 8; }
    .score-fill {
      fill: none;
      stroke: #1d9bf0;
      stroke-width: 8;
      stroke-linecap: round;
      stroke-dasharray: 339.3;
      stroke-dashoffset: 339.3;
      transition: stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.5s ease;
    }

    .score-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
    }

    .score-value {
      display: block;
      font-size: 36px;
      font-weight: 700;
      color: #fff;
      line-height: 1;
    }

    .score-label {
      font-size: 12px;
      color: #71767b;
    }
	
	
    .score-grade {
      display: block;
      margin-top: 4px;
      font-size: 14px;
      font-weight: 700;
      color: #fff;
    }

    .risk-badge {
      display: inline-block;
      padding: 5px 18px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .risk-low { background: rgba(0,186,124,0.15); color: #00ba7c; border: 1px solid rgba(0,186,124,0.3); }
    .risk-medium { background: rgba(255,212,0,0.15); color: #ffd400; border: 1px solid rgba(255,212,0,0.3); }
    .risk-high { background: rgba(249,24,128,0.15); color: #f91880; border: 1px solid rgba(249,24,128,0.3); animation: pulse 2s infinite; }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.06); }
    }

    /* Section headers */
    h2 {
      font-size: 14px;
      font-weight: 600;
      color: #e7e9ea;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid #2f3336;
    }

    .section { margin-bottom: 20px; }

    /* Breakdown bars */
    .breakdown-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 9px 12px;
      background: #16202a;
      border-radius: 8px;
      margin-bottom: 6px;
    }

    .bd-label {
      font-size: 12px;
      color: #71767b;
      flex: 1;
    }

    .bd-bar-wrap {
      flex: 1.5;
      margin: 0 12px;
      height: 6px;
      background: #2f3336;
      border-radius: 3px;
      overflow: hidden;
    }

    .bd-bar {
      height: 100%;
      border-radius: 3px;
      transition: width 0.8s ease-out;
    }

    .bd-score {
      font-size: 12px;
      font-weight: 600;
      color: #e7e9ea;
      min-width: 42px;
      text-align: right;
    }

    /* ML chips */
    .ml-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .ml-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      background: #16202a;
      border-radius: 20px;
      font-size: 11px;
    }

    .ml-chip-label { color: #71767b; }
    .ml-chip-value { font-weight: 600; color: #e7e9ea; }

    /* Recommendations */
    .rec-item {
      padding: 11px 14px;
      border-radius: 8px;
      border-left: 3px solid;
      margin-bottom: 8px;
    }

    .rec-high { background: rgba(249,24,128,0.08); border-color: #f91880; }
    .rec-medium { background: rgba(255,212,0,0.08); border-color: #ffd400; }
    .rec-low { background: rgba(0,186,124,0.08); border-color: #00ba7c; }

    .rec-message { font-size: 12px; color: #e7e9ea; margin-bottom: 4px; line-height: 1.4; }
    .rec-action { font-size: 11px; color: #71767b; line-height: 1.4; }

    /* Tracker list */
    .tracker-list {
      list-style: none;
      max-height: 180px;
      overflow-y: auto;
    }

    .tracker-list li {
      padding: 5px 12px;
      font-size: 11px;
      color: #f91880;
      background: rgba(249,24,128,0.05);
      border-radius: 4px;
      margin-bottom: 4px;
      font-family: "SF Mono", Monaco, "Cascadia Code", "Consolas", monospace;
    }

    /* Footer */
    .panel-footer {
      text-align: center;
      padding: 14px;
      border-top: 1px solid #2f3336;
      flex-shrink: 0;
    }

    .panel-footer p {
      font-size: 10px;
      color: #536471;
    }

    /* Loading */
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: #71767b;
      font-size: 13px;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #2f3336;
      border-top-color: #1d9bf0;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 14px;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #2f3336; border-radius: 3px; }
  `;

  // ── Shield icon ──
  const shieldSvg = `<svg viewBox="0 0 128 128" class="header-icon">
    <defs><linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1d9bf0"/><stop offset="100%" style="stop-color:#0066cc"/>
    </linearGradient></defs>
    <path d="M64 8 L112 28 L112 60 C112 92 90 112 64 120 C38 112 16 92 16 60 L16 28 Z" fill="url(#sg)"/>
    <path d="M52 64 L60 72 L78 52" stroke="white" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

  // ── Build panel structure ──
  const overlay = document.createElement("div");
  overlay.className = "panel-overlay";

  const panel = document.createElement("div");
  panel.className = "panel";
  panel.innerHTML = `
    <div class="panel-header">
      ${shieldSvg}
      <div class="header-text">
        <div class="header-title">Privacy Scorecard</div>
        <div class="header-domain">${escapeHtml(window.location.hostname)}</div>
      </div>
      <button class="header-btn" id="ps-close" title="Close">&times;</button>
    </div>
    <div class="panel-body" id="ps-body">
      <div class="loading">
        <div class="spinner"></div>
        Analyzing privacy &amp; security...
      </div>
    </div>
    <div class="panel-footer">
      <p>All analysis is performed locally. No data is transmitted.</p>
    </div>
  `;

  shadow.appendChild(style);
  shadow.appendChild(overlay);
  shadow.appendChild(panel);

  // ── Close logic ──
  function closePanel() {
    panel.classList.remove("open");
    panel.classList.add("closing");
    overlay.classList.remove("visible");
    setTimeout(() => host.remove(), 350);
    try { sessionStorage.setItem("ps-panel-dismissed", "1"); } catch (e) {}
  }

  shadow.getElementById("ps-close").addEventListener("click", closePanel);
  overlay.addEventListener("click", closePanel);

  // Close on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.getElementById("ps-privacy-panel")) {
      closePanel();
    }
  });

  // ── Inject & animate open ──
  document.documentElement.appendChild(host);
  requestAnimationFrame(() => {
    overlay.classList.add("visible");
    panel.classList.add("open");
  });

  // ── Request data with retry logic ──
  // The service worker may be waking up, so retry up to 3 times.
  let retryCount = 0;
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [1500, 3000, 5000]; // increasing delays

  function requestPrivacyData() {
    chrome.runtime.sendMessage(
      { type: "GET_PRIVACY_DATA_FOR_BADGE" },
      (response) => {
        if (chrome.runtime.lastError || !response || response.error) {
          retryCount++;
          if (retryCount < MAX_RETRIES) {
            // Retry after a delay — service worker may still be starting
            setTimeout(requestPrivacyData, RETRY_DELAYS[retryCount]);
          } else {
            renderError(shadow);
          }
          return;
        }
        renderFullReport(shadow, response);
      }
    );
  }

  // Initial request after short delay to let the page settle
  setTimeout(requestPrivacyData, RETRY_DELAYS[0]);

  // Also accept pushed updates from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "PRIVACY_SCORE_UPDATE" && message.data) {
      renderFullReport(shadow, message.data);
    }
  });

  // ────────────────────────────────────────
  // RENDER FUNCTIONS
  // ────────────────────────────────────────

  function renderFullReport(shadow, data) {
    const body = shadow.getElementById("ps-body");
    const score = data.finalScore.score;
    const risk = data.finalScore.riskLevel;
    const features = data.features;
    const breakdown = data.ruleBasedScore.breakdown;
    const ml = data.mlAnalysis;
    const recs = data.recommendations;

    const colors = { low: "#00ba7c", medium: "#ffd400", high: "#f91880" };
    const color = colors[risk] || "#1d9bf0";
    const circumference = 2 * Math.PI * 54;
    const offset = circumference - (score / 100) * circumference;

    body.innerHTML = `
      <!-- Score -->
      <div class="score-section">
        <div class="score-ring">
          <svg viewBox="0 0 120 120">
            <circle class="score-bg" cx="60" cy="60" r="54" />
            <circle class="score-fill" cx="60" cy="60" r="54"
                    style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${circumference};" />
          </svg>
          <div class="score-text">
          <span class="score-value" id="ps-score-num">0</span>
          <span class="score-label">/ 100</span>
          <span class="score-grade" id="ps-score-grade">${data.finalScore.grade || "--"}</span>
          </div>
        </div>
        <div class="risk-badge risk-${risk}">${risk} risk</div>
      </div>

      <!-- Breakdown -->
      <div class="section">
        <h2>Score Breakdown</h2>
        <div id="ps-breakdown"></div>
      </div>

      <!-- ML Analysis -->
      <div class="section">
        <h2>ML Analysis</h2>
        <div class="ml-chips" id="ps-ml"></div>
      </div>

      <!-- Recommendations -->
      <div class="section">
        <h2>Recommendations</h2>
        <div id="ps-recs"></div>
      </div>

      <!-- Trackers -->
      <div class="section" id="ps-trackers-section" style="display:none;">
        <h2>Detected Trackers</h2>
        <ul class="tracker-list" id="ps-trackers"></ul>
      </div>
    `;

    // Animate score ring
    requestAnimationFrame(() => {
      const fill = shadow.querySelector(".score-fill");
      if (fill) {
        fill.style.stroke = color;
        fill.style.strokeDashoffset = offset;
      }
    });

    // Animate score number
    animateNumber(shadow.getElementById("ps-score-num"), 0, score, 1000);

    // Breakdown
    const bdContainer = shadow.getElementById("ps-breakdown");
    const labels = {
      https: "HTTPS Security",
      trackers: "Trackers",
      cookies: "Cookies",
      fingerprinting: "Fingerprinting",
      permissions: "Permissions",
      thirdPartyRatio: "3rd Party Ratio",
    };
    for (const [key, d] of Object.entries(breakdown)) {
      const pct = (d.score / d.max) * 100;
      const barColor = pct >= 75 ? "#00ba7c" : pct >= 45 ? "#ffd400" : "#f91880";
      const item = document.createElement("div");
      item.className = "breakdown-item";
      item.title = d.detail;
      item.innerHTML = `
        <span class="bd-label">${labels[key] || key}</span>
        <div class="bd-bar-wrap">
          <div class="bd-bar" style="width: 0%; background: ${barColor};"></div>
        </div>
        <span class="bd-score">${d.score} / ${d.max}</span>
      `;
      bdContainer.appendChild(item);
      setTimeout(() => {
        item.querySelector(".bd-bar").style.width = pct + "%";
      }, 200);
    }

    // ML chips
    const mlContainer = shadow.getElementById("ps-ml");
    const chips = [
      { label: "Cluster", value: ml.riskCluster, color: colors[ml.riskCluster] || "#71767b" },
      { label: "Anomaly", value: ml.isAnomaly ? "Yes" : "No", color: ml.isAnomaly ? "#f91880" : "#00ba7c" },
      { label: "Anomaly Score", value: ml.anomalyScore.toFixed(2), color: ml.anomalyScore > 0.6 ? "#f91880" : "#71767b" },
      { label: "Noise Point", value: ml.isNoise ? "Yes" : "No", color: ml.isNoise ? "#ffd400" : "#71767b" },
    ];
    for (const chip of chips) {
      const el = document.createElement("div");
      el.className = "ml-chip";
      el.innerHTML = `<span class="ml-chip-label">${chip.label}:</span>
                       <span class="ml-chip-value" style="color:${chip.color}">${chip.value}</span>`;
      mlContainer.appendChild(el);
    }

    // Recommendations
    const recContainer = shadow.getElementById("ps-recs");
    for (const rec of recs) {
      const el = document.createElement("div");
      el.className = `rec-item rec-${rec.severity}`;
      el.innerHTML = `<div class="rec-message">${escapeHtml(rec.message)}</div>
                       <div class="rec-action">${escapeHtml(rec.action)}</div>`;
      recContainer.appendChild(el);
    }

    // Trackers
    if (features.trackerDomains && features.trackerDomains.length > 0) {
      shadow.getElementById("ps-trackers-section").style.display = "block";
      const list = shadow.getElementById("ps-trackers");
      for (const domain of features.trackerDomains) {
        const li = document.createElement("li");
        li.textContent = domain;
        list.appendChild(li);
      }
    }
  }

  function renderError(shadow) {
    const body = shadow.getElementById("ps-body");
    body.innerHTML = `
      <div class="loading" style="color:#71767b;">
        <p>Could not analyze this page.</p>
        <p style="margin-top:8px; font-size:11px;">Try reloading the website.</p>
      </div>
    `;
  }

  // ── Utilities ──

  function animateNumber(element, start, end, duration) {
    if (!element) return;
    const startTime = performance.now();
    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = Math.round(start + (end - start) * eased);
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  function escapeHtml(text) {
    const el = document.createElement("span");
    el.textContent = text;
    return el.innerHTML;
  }
})();
