/**
 * Test Suite for Privacy Scorecard Extension
 * Run with: node test/run-tests.js
 *
 * Tests the rule-based scorer, ML engine, and feature extraction logic
 * without requiring a browser environment.
 */

// Since the extension uses ES modules, we inline the core logic here for testing.
// In a production setup, you'd use a bundler or test framework with ESM support.

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
  }
}

function assertRange(value, min, max, message) {
  assert(value >= min && value <= max, `${message} (got ${value}, expected ${min}-${max})`);
}

// ─── Rule-Based Scorer Tests ───

console.log("\n=== Rule-Based Scorer Tests ===\n");

// Inline scoring functions (mirroring rule-based-scorer.js)
function trackerScore(count) {
  if (count === 0) return 25;
  if (count <= 2) return 20;
  if (count <= 5) return 15;
  if (count <= 10) return 8;
  if (count <= 20) return 3;
  return 0;
}

function cookieScore(thirdPartyCookies) {
  if (thirdPartyCookies === 0) return 15;
  if (thirdPartyCookies <= 2) return 12;
  if (thirdPartyCookies <= 5) return 8;
  if (thirdPartyCookies <= 10) return 4;
  return 0;
}

function fingerprintingScore(detected, apiCount) {
  if (!detected) return 20;
  if (apiCount <= 1) return 14;
  if (apiCount <= 3) return 8;
  return 0;
}

function permissionsScore(count) {
  if (count === 0) return 10;
  if (count === 1) return 7;
  if (count <= 3) return 4;
  return 0;
}

function thirdPartyRatioScore(ratio) {
  if (ratio <= 0.1) return 5;
  if (ratio <= 0.3) return 4;
  if (ratio <= 0.5) return 2;
  return 0;
}

function calculateScore(features) {
  let total = 0;
  // HTTPS
  let https = features.isHttps ? 25 : 0;
  if (features.isHttps && features.mixedContent) https = 15;
  total += https;
  total += trackerScore(features.trackerCount);
  total += cookieScore(features.thirdPartyCookies);
  total += fingerprintingScore(features.fingerprintingDetected, features.fingerprintingApiCount);
  total += permissionsScore(features.permissionsCount);
  total += thirdPartyRatioScore(features.thirdPartyRatio);
  return total;
}

// Test 1: Perfect privacy site
const perfectSite = {
  trackerCount: 0, thirdPartyCookies: 0, isHttps: 1, mixedContent: 0,
  thirdPartyRatio: 0.05, fingerprintingDetected: 0, fingerprintingApiCount: 0, permissionsCount: 0,
};
assert(calculateScore(perfectSite) === 100, "Perfect privacy site scores 100");

// Test 2: No HTTPS
const noHttps = { ...perfectSite, isHttps: 0 };
assert(calculateScore(noHttps) === 75, "No HTTPS reduces score by 25 points");

// Test 3: Heavy tracking
const heavyTracking = {
  trackerCount: 15, thirdPartyCookies: 12, isHttps: 1, mixedContent: 0,
  thirdPartyRatio: 0.55, fingerprintingDetected: 1, fingerprintingApiCount: 5, permissionsCount: 2,
};
const heavyScore = calculateScore(heavyTracking);
assertRange(heavyScore, 0, 40, "Heavy tracking site scores below 40");

// Test 4: Worst case
const worstCase = {
  trackerCount: 30, thirdPartyCookies: 20, isHttps: 0, mixedContent: 0,
  thirdPartyRatio: 0.8, fingerprintingDetected: 1, fingerprintingApiCount: 8, permissionsCount: 5,
};
assert(calculateScore(worstCase) === 0, "Worst case site scores 0");

// Test 5: Mixed content
const mixedContent = { ...perfectSite, mixedContent: 1 };
assert(calculateScore(mixedContent) === 90, "Mixed content on HTTPS reduces HTTPS score to 15");

// Test 6: Individual scorer boundaries
assert(trackerScore(0) === 25, "0 trackers = 25 points");
assert(trackerScore(2) === 20, "2 trackers = 20 points");
assert(trackerScore(5) === 15, "5 trackers = 15 points");
assert(trackerScore(10) === 8, "10 trackers = 8 points");
assert(trackerScore(20) === 3, "20 trackers = 3 points");
assert(trackerScore(21) === 0, "21 trackers = 0 points");

assert(cookieScore(0) === 15, "0 third-party cookies = 15 points");
assert(cookieScore(5) === 8, "5 third-party cookies = 8 points");
assert(cookieScore(11) === 0, "11 third-party cookies = 0 points");

// ─── ML Engine Tests ───

console.log("\n=== ML Engine Tests ===\n");

// Inline ML functions (mirroring ml-engine.js)
function normalize(vector) {
  const ranges = [[0,30],[0,20],[0,1],[0,1],[0,1],[0,1],[0,8],[0,5]];
  return vector.map((val, i) => {
    const [min, max] = ranges[i];
    if (max === min) return 0;
    return Math.max(0, Math.min(1, (val - min) / (max - min)));
  });
}

function euclideanDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

const CENTROIDS = [
  [0.05, 0.05, 1.0, 0.0, 0.1, 0.0, 0.0, 0.0],
  [0.3, 0.25, 0.9, 0.1, 0.35, 0.3, 0.2, 0.15],
  [0.7, 0.6, 0.5, 0.4, 0.65, 0.8, 0.6, 0.4],
];
const LABELS = ["low", "medium", "high"];

function kmeansPredict(normalized) {
  let minDist = Infinity, best = 0;
  for (let i = 0; i < CENTROIDS.length; i++) {
    const dist = euclideanDistance(normalized, CENTROIDS[i]);
    if (dist < minDist) { minDist = dist; best = i; }
  }
  return { cluster: best, riskLevel: LABELS[best] };
}

// Test 7: Clean site clusters as low risk
const cleanVector = normalize([0, 0, 1, 0, 0.05, 0, 0, 0]);
const cleanResult = kmeansPredict(cleanVector);
assert(cleanResult.riskLevel === "low", "Clean site clusters as low risk");

// Test 8: Moderate site clusters as medium risk
const moderateVector = normalize([8, 5, 1, 0, 0.35, 1, 2, 1]);
const moderateResult = kmeansPredict(moderateVector);
assert(moderateResult.riskLevel === "medium", "Moderate tracking site clusters as medium risk");

// Test 9: Aggressive site clusters as high risk
const aggressiveVector = normalize([25, 15, 0, 1, 0.7, 1, 7, 4]);
const aggressiveResult = kmeansPredict(aggressiveVector);
assert(aggressiveResult.riskLevel === "high", "Aggressive tracking site clusters as high risk");

// Test 10: Normalization bounds
const normalized = normalize([50, 30, 1, 1, 2.0, 1, 20, 10]);
assert(normalized.every(v => v >= 0 && v <= 1), "Normalization clamps values to [0, 1]");

const normalizedZeros = normalize([0, 0, 0, 0, 0, 0, 0, 0]);
assert(normalizedZeros.every(v => v === 0), "All zeros normalize to all zeros");

// ─── Dataset Validation Tests ───

console.log("\n=== Dataset Validation Tests ===\n");

const fs = require("fs");
const path = require("path");
const dataset = JSON.parse(fs.readFileSync(path.join(__dirname, "../src/data/sample-dataset.json"), "utf8"));

assert(dataset.data.length === 20, "Dataset has 20 samples");
assert(dataset.features.length === 8, "Dataset has 8 features");

// Verify all entries have required fields
const requiredFields = dataset.features;
let allFieldsPresent = true;
for (const entry of dataset.data) {
  for (const field of requiredFields) {
    if (entry[field] === undefined) {
      allFieldsPresent = false;
      break;
    }
  }
}
assert(allFieldsPresent, "All dataset entries have required feature fields");

// Test scores on dataset entries
const datasetScores = dataset.data.map(entry => ({
  label: entry.label,
  score: calculateScore(entry),
}));

const privacyBlog = datasetScores.find(d => d.label === "privacy-focused-blog");
assert(privacyBlog.score === 100, "Privacy-focused blog scores 100 in dataset");

const suspiciousSite = datasetScores.find(d => d.label === "suspicious-download-site");
assert(suspiciousSite.score === 0, "Suspicious download site scores 0 in dataset");

// Verify scores are monotonically related to risk
const sortedByTrackers = [...dataset.data].sort((a, b) => a.trackerCount - b.trackerCount);
const firstScore = calculateScore(sortedByTrackers[0]);
const lastScore = calculateScore(sortedByTrackers[sortedByTrackers.length - 1]);
assert(firstScore >= lastScore, "Sites with fewer trackers score higher than those with more");

// ─── Integration Test: Full Pipeline ───

console.log("\n=== Integration Tests ===\n");

function fullPipeline(features) {
  const score = calculateScore(features);
  const vector = [
    features.trackerCount, features.thirdPartyCookies, features.isHttps,
    features.mixedContent, features.thirdPartyRatio, features.fingerprintingDetected,
    features.fingerprintingApiCount, features.permissionsCount,
  ];
  const normalized = normalize(vector);
  const cluster = kmeansPredict(normalized);
  const riskLevel = score >= 75 ? "low" : score >= 45 ? "medium" : "high";
  return { score, riskLevel, cluster: cluster.riskLevel };
}

const pipeline1 = fullPipeline(perfectSite);
assert(pipeline1.score === 100 && pipeline1.riskLevel === "low", "Full pipeline: clean site = score 100, low risk");

const pipeline2 = fullPipeline(worstCase);
assert(pipeline2.score === 0 && pipeline2.riskLevel === "high", "Full pipeline: worst case = score 0, high risk");

// Run all dataset entries through pipeline
let pipelineErrors = 0;
for (const entry of dataset.data) {
  const result = fullPipeline(entry);
  if (result.score < 0 || result.score > 100) pipelineErrors++;
  if (!["low", "medium", "high"].includes(result.riskLevel)) pipelineErrors++;
}
assert(pipelineErrors === 0, "Full pipeline produces valid results for all dataset entries");

// ─── Summary ───

console.log("\n" + "=".repeat(50));
console.log(`  Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log("=".repeat(50) + "\n");

process.exit(failed > 0 ? 1 : 0);
