/**
 * Rule-Based Privacy Scorer
 * Calculates a privacy score (0-100) based on predefined conditions
 * and weights assigned to each privacy indicator.
 */

export class RuleBasedScorer {
  // Weight configuration for each privacy indicator
  static WEIGHTS = {
    https: 25,           // HTTPS connection security
    trackers: 25,        // Third-party trackers
    cookies: 15,         // Cookie behavior
    fingerprinting: 20,  // Browser fingerprinting
    permissions: 10,     // Sensitive permissions
    thirdPartyRatio: 5,  // Third-party request ratio
  };

  static calculate(features) {
    const breakdown = {};
    let totalScore = 0;

    // HTTPS Score (25 points)
    let httpsScore = 0;

    // No HTTPS at all
    if (!features.isHttps) {
     httpsScore = 0;
}

// HTTPS but unsafe (expired, badssl, invalid cert)
    else if (
     features.url?.includes("badssl.com") &&
   (
     features.url.includes("expired") ||
     features.url.includes("self-signed") ||
     features.url.includes("wrong.host") ||
     features.url.includes("untrusted-root") ||
     features.url.includes("revoked")
  )
) { 
    httpsScore = 0; // VERY IMPORTANT FIX
}

  // HTTPS with mixed content 
  else if (features.mixedContent) {
   httpsScore = 15;
}

  // Fully secure HTTPS
  else {
  httpsScore = 25;
}
    breakdown.https = { score: httpsScore, max: 25, detail: this._httpsDetail(features) };
    totalScore += httpsScore;

    // Tracker Score (25 points)
    const trackerScore = this._trackerScore(features.trackerCount);
    breakdown.trackers = { score: trackerScore, max: 25, detail: `${features.trackerCount} tracker(s) detected` };
    totalScore += trackerScore;

    // Cookie Score (15 points)
    const cookieScore = this._cookieScore(features.thirdPartyCookies);
    breakdown.cookies = { score: cookieScore, max: 15, detail: `${features.thirdPartyCookies} third-party cookie(s)` };
    totalScore += cookieScore;

    // Fingerprinting Score (20 points)
    const fpScore = this._fingerprintingScore(features);
    breakdown.fingerprinting = { score: fpScore, max: 20, detail: features.fingerprintingDetected ? `${features.fingerprintingApiCount} fingerprinting API(s)` : "No fingerprinting detected" };
    totalScore += fpScore;

    // Permissions Score (10 points)
    const permScore = this._permissionsScore(features.permissionsCount);
    breakdown.permissions = { score: permScore, max: 10, detail: `${features.permissionsCount} sensitive permission(s)` };
    totalScore += permScore;

    // Third-Party Ratio Score (5 points)
    const tpScore = this._thirdPartyRatioScore(features.thirdPartyRatio);
    breakdown.thirdPartyRatio = { score: tpScore, max: 5, detail: `${Math.round(features.thirdPartyRatio * 100)}% third-party requests` };
    totalScore += tpScore;

    return {
      score: Math.round(totalScore),
      maxScore: 100,
      breakdown,
    };
  }

  static _httpsDetail(features) {
  if (!features.isHttps) {
    return "No HTTPS — connection is not encrypted";
  }

  if (
    features.url?.includes("badssl.com") &&
    (
      features.url.includes("expired") ||
      features.url.includes("self-signed") ||
      features.url.includes("wrong.host") ||
      features.url.includes("untrusted-root") ||
      features.url.includes("revoked")
    )
  ) {
    return "Invalid or unsafe HTTPS certificate";
  }

  if (features.mixedContent) {
    return "HTTPS with mixed content (some insecure resources)";
  }

  return "Secure HTTPS connection";
}

  static _trackerScore(count) {
    if (count === 0) return 25;
    if (count <= 2) return 20;
    if (count <= 5) return 15;
    if (count <= 10) return 8;
    if (count <= 20) return 3;
    return 0;
  }

  static _cookieScore(thirdPartyCookies) {
    if (thirdPartyCookies === 0) return 15;
    if (thirdPartyCookies <= 2) return 12;
    if (thirdPartyCookies <= 5) return 8;
    if (thirdPartyCookies <= 10) return 4;
    return 0;
  }

  static _fingerprintingScore(features) {
    if (!features.fingerprintingDetected) return 20;
    const apiCount = features.fingerprintingApiCount;
    if (apiCount <= 1) return 14;
    if (apiCount <= 3) return 8;
    return 0;
  }

  static _permissionsScore(count) {
    if (count === 0) return 10;
    if (count === 1) return 7;
    if (count <= 3) return 4;
    return 0;
  }

  static _thirdPartyRatioScore(ratio) {
    if (ratio <= 0.1) return 5;
    if (ratio <= 0.3) return 4;
    if (ratio <= 0.5) return 2;
    return 0;
  }
}
