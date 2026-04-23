# Privacy Scorecard Chrome Extension

Real-time web security and privacy assessment using machine learning. Evaluates trackers, cookies, HTTPS security, fingerprinting risks, and more — all locally in your browser.

## Features

- **Real-time privacy scoring** (0–100) for every website you visit
- **ML-powered analysis** using K-Means clustering, DBSCAN, and Isolation Forest
- **Rule-based scoring** with weighted privacy indicators
- **Fingerprinting detection** — monitors Canvas, WebGL, AudioContext, and navigator API abuse
- **Tracker detection** — identifies 60+ known advertising, analytics, and data broker domains
- **Cookie analysis** — counts first-party and third-party cookies
- **Actionable recommendations** — severity-rated suggestions for each risk
- **100% local** — no data is collected, stored, or transmitted

## Project Structure

```
privacy-scorecard-extension/
├── manifest.json                 # Chrome Extension Manifest V3
├── package.json
├── src/
│   ├── background/
│   │   └── service-worker.js     # Network monitoring, tracker/cookie detection
│   ├── content/
│   │   └── content-script.js     # Fingerprinting & permission detection
│   ├── popup/
│   │   ├── popup.html            # Extension popup UI
│   │   ├── popup.css             # Dark theme styles
│   │   └── popup.js              # Score rendering & animations
│   ├── ml/
│   │   ├── ml-engine.js          # K-Means, DBSCAN, Isolation Forest
│   │   └── rule-based-scorer.js  # Weighted rule-based scoring (0-100)
│   ├── data/
│   │   └── sample-dataset.json   # 20-sample training/validation dataset
│   └── utils/
│       └── tracker-lists.js      # Known tracker domains & fingerprint APIs
├── assets/                       # Extension icons (SVG placeholders)
├── scripts/
│   └── generate-icons.js         # Icon generation utility
└── test/
    └── run-tests.js              # 28 unit + integration tests
```

## How It Works

### Privacy Indicators Collected

| Indicator | Weight | Description |
|-----------|--------|-------------|
| HTTPS Security | 25% | Connection encryption and mixed content detection |
| Third-party Trackers | 25% | Known ad/analytics/data broker domains |
| Cookie Behavior | 15% | Third-party cookie count |
| Browser Fingerprinting | 20% | Canvas, WebGL, AudioContext, navigator API monitoring |
| Permissions Requested | 10% | Camera, microphone, geolocation, etc. |
| Third-party Ratio | 5% | Proportion of requests to external domains |

### Machine Learning Algorithms

1. **K-Means Clustering (k=3)** — Groups websites into low/medium/high risk clusters based on pre-trained centroids
2. **DBSCAN** — Identifies outlier websites with unusual privacy profiles (noise points)
3. **Isolation Forest** — Detects anomalous behavior patterns that may indicate aggressive tracking

### Scoring

- **Rule-based score** (70% weight): Deterministic scoring using the weighted indicators above
- **ML adjustment** (30% weight): Anomaly and cluster analysis can lower the score for suspicious patterns
- **Final score**: 0–100, classified as Low Risk (75–100), Medium Risk (45–74), or High Risk (0–44)

## Setup & Installation

### Prerequisites

- Google Chrome (version 112+)
- Node.js (for running tests only)

### Step 1: Clone / Download

```bash
git clone <repository-url>
cd privacy-scorecard-extension
```

### Step 2: Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **"Load unpacked"**
4. Select the `privacy-scorecard-extension` folder
5. The Privacy Scorecard icon (shield) should appear in your toolbar

### Step 3: Pin the Extension (Optional)

Click the puzzle piece icon in Chrome's toolbar and pin "Privacy Scorecard" for quick access.

## Usage

1. Navigate to any website
2. Click the Privacy Scorecard icon in the toolbar
3. View your results:
   - **Privacy Score** — overall score (0–100) with animated ring
   - **Score Breakdown** — detailed per-indicator scores
   - **ML Analysis** — cluster assignment, anomaly detection results
   - **Recommendations** — actionable steps to improve privacy
   - **Detected Trackers** — list of identified tracker domains

## Running Tests

```bash
# Run the full test suite (28 tests)
node test/run-tests.js
```

Tests cover:
- Rule-based scorer (boundary values, edge cases)
- ML engine (normalization, clustering, anomaly detection)
- Dataset validation (schema, feature completeness)
- Integration (full pipeline end-to-end)

### Expected Output

```
=== Rule-Based Scorer Tests ===
  PASS: Perfect privacy site scores 100
  PASS: No HTTPS reduces score by 25 points
  ...

=== ML Engine Tests ===
  PASS: Clean site clusters as low risk
  ...

=== Dataset Validation Tests ===
  PASS: Dataset has 20 samples
  ...

=== Integration Tests ===
  PASS: Full pipeline produces valid results for all dataset entries

==================================================
  Results: 28 passed, 0 failed, 28 total
==================================================
```

## Testing in Chrome (Manual)

1. Load the extension as described in Setup
2. Visit various websites and check the popup for each:
   - A privacy-focused site (e.g., `duckduckgo.com`) should score high (75+)
   - A heavily ad-supported site should score lower
   - An HTTP-only site should lose 25 points for no HTTPS
3. Check the Chrome DevTools console (background service worker) for debug info:
   - Go to `chrome://extensions/` → Privacy Scorecard → "Inspect views: service worker"

## Dataset

The sample dataset (`src/data/sample-dataset.json`) contains 20 entries representing different website privacy profiles, from privacy-focused blogs (score: 100) to suspicious download sites (score: 0). It is derived from:

- [Open Cookie Database](https://github.com/nicedoc/open-cookie-database)
- EasyList / EasyPrivacy tracker lists
- Academic fingerprinting research datasets

## Technology Stack

- **Chrome Extension Manifest V3** — modern extension platform
- **Vanilla JavaScript** — no external dependencies
- **ES Modules** — clean module structure
- **Web Request API** — network-level tracker monitoring
- **Content Scripts** — page-level fingerprinting detection

## License

MIT
