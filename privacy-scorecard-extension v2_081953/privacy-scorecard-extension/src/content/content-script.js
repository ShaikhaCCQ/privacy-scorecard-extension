/**
 * Content Script
 * Detects browser fingerprinting attempts and permission requests on the page.
 * Runs in the page context to monitor suspicious API usage.
 */

(function () {
  "use strict";

  const FINGERPRINT_SIGNALS = {
    canvas: false,
    webgl: false,
    audio: false,
    battery: false,
    plugins: false,
    hardware: false,
    screen: false,
  };

  const detectedApis = [];

  // Inject a monitoring script into the page context
 const monitorScript = document.createElement("script");
monitorScript.src = chrome.runtime.getURL("src/injected/fingerprint-monitor.js");
monitorScript.onload = () => monitorScript.remove();

  (document.head || document.documentElement).prepend(monitorScript);
 

  // Listen for fingerprinting signals from the injected script
  const seenApis = new Set();
  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data || event.data.type !== "__PRIVACY_FP__") {
      return;
    }

    const api = event.data.api;
    if (!seenApis.has(api)) {
      seenApis.add(api);
      detectedApis.push(api);

      // Notify background script
      chrome.runtime.sendMessage({
        type: "FINGERPRINT_DETECTED",
        apis: [...seenApis],
      });
    }
  });

  // Detect permission requests
  const permissionsDetected = new Set();

  if (navigator.permissions && navigator.permissions.query) {
    const origQuery = navigator.permissions.query.bind(navigator.permissions);
    navigator.permissions.query = function (descriptor) {
      if (descriptor && descriptor.name) {
        permissionsDetected.add(descriptor.name);
        chrome.runtime.sendMessage({
          type: "PERMISSIONS_DETECTED",
          permissions: [...permissionsDetected],
        });
      }
      return origQuery(descriptor);
    };
  }

  // Detect geolocation requests
  if (navigator.geolocation) {
    const origGetPos = navigator.geolocation.getCurrentPosition;
    navigator.geolocation.getCurrentPosition = function () {
      permissionsDetected.add("geolocation");
      chrome.runtime.sendMessage({
        type: "PERMISSIONS_DETECTED",
        permissions: [...permissionsDetected],
      });
      return origGetPos.apply(this, arguments);
    };
  }

  // Detect media device access (camera/microphone)
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = function (constraints) {
      if (constraints) {
        if (constraints.video) permissionsDetected.add("camera");
        if (constraints.audio) permissionsDetected.add("microphone");
        chrome.runtime.sendMessage({
          type: "PERMISSIONS_DETECTED",
          permissions: [...permissionsDetected],
        });
      }
      return origGetUserMedia(constraints);
    };
  }
})();
