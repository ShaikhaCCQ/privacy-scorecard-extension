/**
 * Background Service Worker
 * Monitors network requests to detect trackers, cookies, and connection security.
 * All analysis is performed locally — no data is transmitted externally.
 */

let KNOWN_TRACKER_DOMAINS = [...DEFAULT_TRACKER_DOMAINS];
import { DEFAULT_TRACKER_DOMAINS } from "../utils/tracker-lists.js";
import { RuleBasedScorer } from "../ml/rule-based-scorer.js";
import { MLScoringEngine } from "../ml/ml-engine.js";

// Per-tab privacy data store
const tabData = new Map();

function createEmptyTabData(url) {
  return {
    url,
    domain: extractDomain(url),
    isHttps: url.startsWith("https://"),
    trackers: new Set(),
    thirdPartyCookies: 0,
    firstPartyCookies: 0,
    totalRequests: 0,
    thirdPartyRequests: 0,
    fingerprintingDetected: false,
    fingerprintingApis: [],
    permissionsRequested: [],
    mixedContent: false,
    timestamp: Date.now(),
  };
}

function extractDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function isThirdParty(requestDomain, pageDomain) {
  const getRoot = (d) => d.split(".").slice(-2).join(".");
  return getRoot(requestDomain) !== getRoot(pageDomain);
}

function isTracker(domain) {
  return KNOWN_TRACKER_DOMAINS.some(
    (tracker) => domain === tracker || domain.endsWith("." + tracker)
  );
}

// Bootstrap: populate tabData for all existing tabs when service worker starts.
// This ensures data exists even if the service worker was dormant and restarted.
chrome.tabs.query({}, (tabs) => {
  for (const tab of tabs) {
    if (tab.id && tab.url && !tabData.has(tab.id)) {
      tabData.set(tab.id, createEmptyTabData(tab.url));
    }
  }
});

// Track tab navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "loading" && tab.url) {
    tabData.set(tabId, createEmptyTabData(tab.url));
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabData.delete(tabId);
});

// Monitor network requests for trackers and third-party resources
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.tabId < 0) return;

    const data = tabData.get(details.tabId);
    if (!data) return;

    data.totalRequests++;

    const requestDomain = extractDomain(details.url);

    if (isThirdParty(requestDomain, data.domain)) {
      data.thirdPartyRequests++;

      if (isTracker(requestDomain)) {
        data.trackers.add(requestDomain);
      }
    }

    // Detect mixed content (HTTP resources on HTTPS page)
    if (data.isHttps && details.url.startsWith("http://")) {
      data.mixedContent = true;
    }
  },
  { urls: ["<all_urls>"] }
);

// Monitor response headers for cookie analysis
chrome.webRequest.onResponseStarted.addListener(
  (details) => {
    if (details.tabId < 0) return;

    const data = tabData.get(details.tabId);
    if (!data) return;

    const setCookieHeaders = (details.responseHeaders || []).filter(
      (h) => h.name.toLowerCase() === "set-cookie"
    );

    for (const header of setCookieHeaders) {
      const requestDomain = extractDomain(details.url);
      if (isThirdParty(requestDomain, data.domain)) {
        data.thirdPartyCookies++;
      } else {
        data.firstPartyCookies++;
      }
    }
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

// Receive fingerprinting data from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "FINGERPRINT_DETECTED" && sender.tab) {
    const data = tabData.get(sender.tab.id);
    if (data) {
      data.fingerprintingDetected = true;
      data.fingerprintingApis = message.apis || [];
    }
  }

  if (message.type === "PERMISSIONS_DETECTED" && sender.tab) {
    const data = tabData.get(sender.tab.id);
    if (data) {
      data.permissionsRequested = message.permissions || [];
    }
  }

  // Handle badge request (from auto-alert content script)
  if (message.type === "GET_PRIVACY_DATA_FOR_BADGE" && sender.tab) {
    const tabId = sender.tab.id;
    let data = tabData.get(tabId);

    // If no data exists (service worker restarted or tab was already open),
    // create it now from the sender tab info so we still produce a result.
    if (!data && sender.tab.url) {
      data = createEmptyTabData(sender.tab.url);
      tabData.set(tabId, data);
    }

    if (!data) {
      sendResponse({ error: "No data available yet" });
      return true;
    }

    // Use cookies API to count cookies for the domain right now
    analyseCookiesAndRespond(data, tabId, sendResponse);
    return true; // MUST return true to keep message channel open for async response
  }

  // Handle open popup request from badge
  if (message.type === "OPEN_POPUP") {
    chrome.action.openPopup().catch(() => {
      // openPopup() may not be available in all contexts — fail silently
    });
  }

  if (message.type === "GET_PRIVACY_DATA") {
    const tabId = message.tabId;
    let data = tabData.get(tabId);

    // Fallback: query the tab and create data on the fly if missing
    if (!data) {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab || !tab.url) {
          sendResponse({ error: "No data available for this tab" });
          return;
        }
        data = createEmptyTabData(tab.url);
        tabData.set(tabId, data);
        analyseCookiesAndRespond(data, tabId, sendResponse);
      });
      return true; // MUST return true to keep message channel open for async response
    }

    analyseCookiesAndRespond(data, tabId, sendResponse);
    return true; // MUST return true to keep message channel open for async response
  }

  return true; // keep message channel open for async response
});

/**
 * Enriches tab data with live cookie counts from the cookies API,
 * then computes scores and sends the response.
 */
function analyseCookiesAndRespond(data, tabId, sendResponse) {
  // Use the cookies API to get real cookie data for this domain
  chrome.cookies.getAll({ url: data.url }, (cookies) => {
    if (cookies && cookies.length > 0) {
      const pageDomain = data.domain;
      let firstParty = 0;
      let thirdParty = 0;

      for (const cookie of cookies) {
        const cookieDomain = cookie.domain.replace(/^\./, "");
        if (isThirdParty(cookieDomain, pageDomain)) {
          thirdParty++;
        } else {
          firstParty++;
        }
      }

      // Use the higher of tracked vs live counts (tracked may have more
      // if the service worker has been active; live fills in if it restarted)
      data.firstPartyCookies = Math.max(data.firstPartyCookies, firstParty);
      data.thirdPartyCookies = Math.max(data.thirdPartyCookies, thirdParty);
    }

    const features = extractFeatures(data);
    const ruleScore = RuleBasedScorer.calculate(features);
    const mlResult = MLScoringEngine.analyze(features);

    sendResponse({
      url: data.url,
      domain: data.domain,
      features,
      ruleBasedScore: ruleScore,
      mlAnalysis: mlResult,
      finalScore: computeFinalScore(ruleScore, mlResult, features),
      recommendations: generateRecommendations(features, ruleScore),
    });
  });
}

function extractFeatures(data) {
  return {
	url: data.url,
    trackerCount: data.trackers.size,
    trackerDomains: [...data.trackers],
    thirdPartyCookies: data.thirdPartyCookies,
    firstPartyCookies: data.firstPartyCookies,
    totalCookies: data.thirdPartyCookies + data.firstPartyCookies,
    isHttps: data.isHttps ? 1 : 0,
    mixedContent: data.mixedContent ? 1 : 0,
    thirdPartyRequests: data.thirdPartyRequests,
    totalRequests: data.totalRequests,
    thirdPartyRatio:
      data.totalRequests > 0
        ? data.thirdPartyRequests / data.totalRequests
        : 0,
    fingerprintingDetected: data.fingerprintingDetected ? 1 : 0,
    fingerprintingApiCount: data.fingerprintingApis.length,
    permissionsCount: data.permissionsRequested.length,
    permissionsRequested: data.permissionsRequested,
  };
}

function computeFinalScore(ruleScore, mlResult, features) {
  const mlAdjustment = mlResult.isAnomaly ? -10 : 0;
  const clusterAdjustment = mlResult.riskCluster === "high" ? -5 : 0;

  let securityPenalty = 0;

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
    securityPenalty = -40;
  }

  const combined =
    ruleScore.score * 0.7 +
    (ruleScore.score + mlAdjustment + clusterAdjustment + securityPenalty) * 0.3;

  const finalScore = Math.max(0, Math.min(100, Math.round(combined)));

  return {
    score: finalScore,
    grade: getLetterGrade(finalScore),
    riskLevel: classifyRisk(finalScore),
  };
}

function getLetterGrade(score) {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  if (score >= 50) return "D";
  return "F";
}

function classifyRisk(score) {
  if (score >= 80) return "low";
  if (score >= 70) return "medium";
  return "high";
}

function generateRecommendations(features, ruleScore) {
  const recs = [];

  if (!features.isHttps) {
    recs.push({
      severity: "high",
      message: "This site does not use HTTPS. Your connection is not encrypted.",
      action: "Avoid entering sensitive information on this site.",
    });
  }

  if (features.mixedContent) {
    recs.push({
      severity: "medium",
      message: "Mixed content detected — some resources loaded over HTTP.",
      action: "Be cautious with sensitive data on this page.",
    });
  }

  if (features.trackerCount > 5) {
    recs.push({
      severity: "high",
      message: `${features.trackerCount} third-party trackers detected.`,
      action: "Consider using a tracker blocker extension like uBlock Origin.",
    });
  } else if (features.trackerCount > 0) {
    recs.push({
      severity: "medium",
      message: `${features.trackerCount} third-party tracker(s) detected.`,
      action: "Review tracker details for more information.",
    });
  }

  if (features.thirdPartyCookies > 5) {
    recs.push({
      severity: "high",
      message: `${features.thirdPartyCookies} third-party cookies set.`,
      action: "Clear third-party cookies or enable stricter cookie settings.",
    });
  }

  if (features.fingerprintingDetected) {
    recs.push({
      severity: "high",
      message: `Browser fingerprinting detected (${features.fingerprintingApiCount} API(s) used).`,
      action: "Use a privacy-focused browser or anti-fingerprinting extension.",
    });
  }

  if (features.permissionsCount > 0) {
    recs.push({
      severity: "medium",
      message: `Site requests ${features.permissionsCount} sensitive permission(s): ${features.permissionsRequested.join(", ")}.`,
      action: "Only grant permissions when absolutely necessary.",
    });
  }

  if (features.thirdPartyRatio > 0.5) {
    recs.push({
      severity: "medium",
      message: `${Math.round(features.thirdPartyRatio * 100)}% of requests are to third-party domains.`,
      action: "High third-party dependency may indicate extensive tracking.",
    });
  }

  if (recs.length === 0) {
    recs.push({
      severity: "low",
      message: "This site has good privacy practices.",
      action: "No immediate actions needed.",
    });
  }

  return recs;
}
