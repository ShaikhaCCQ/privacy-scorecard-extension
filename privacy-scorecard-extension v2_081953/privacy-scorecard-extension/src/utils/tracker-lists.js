/**
 * Known third-party tracker domains and fingerprinting APIs.
 * Derived from open-source tracking databases (EasyList, Disconnect, etc.)
 */


export const DEFAULT_TRACKER_DOMAINS = [
  // Advertising
  "doubleclick.net",
  "googlesyndication.com",
  "googleadservices.com",
  "adnxs.com",
  "adsrvr.org",
  "criteo.com",
  "criteo.net",
  "taboola.com",
  "outbrain.com",
  "amazon-adsystem.com",
  "media.net",
  "pubmatic.com",
  "openx.net",
  "rubiconproject.com",
  "casalemedia.com",
  "indexexchange.com",
  "smartadserver.com",
  "bidswitch.net",
  "advertising.com",
  "adform.net",

  // Analytics
  "google-analytics.com",
  "googletagmanager.com",
  "hotjar.com",
  "mixpanel.com",
  "segment.com",
  "amplitude.com",
  "heapanalytics.com",
  "fullstory.com",
  "mouseflow.com",
  "crazyegg.com",
  "optimizely.com",
  "newrelic.com",
  "nr-data.net",

  // Social Media Trackers
  "facebook.net",
  "facebook.com",
  "fbcdn.net",
  "twitter.com",
  "linkedin.com",
  "platform.twitter.com",
  "connect.facebook.net",
  "snap.licdn.com",
  "ads-twitter.com",
  "tiktok.com",
  "byteoversea.com",

  // Data Brokers / Fingerprinting
  "bluekai.com",
  "exelator.com",
  "quantserve.com",
  "scorecardresearch.com",
  "demdex.net",
  "krxd.net",
  "rlcdn.com",
  "agkn.com",
  "liadm.com",
  "tapad.com",
  "adsymptotic.com",
  "ipify.org",
  "fingerprintjs.com",
];


export const FINGERPRINT_APIS = [
  "canvas.toDataURL",
  "canvas.getContext",
  "CanvasRenderingContext2D.prototype.getImageData",
  "WebGLRenderingContext.prototype.getParameter",
  "WebGLRenderingContext.prototype.getSupportedExtensions",
  "AudioContext",
  "OfflineAudioContext",
  "navigator.getBattery",
  "navigator.deviceMemory",
  "navigator.hardwareConcurrency",
  "navigator.connection",
  "navigator.plugins",
  "navigator.mimeTypes",
  "screen.colorDepth",
  "window.devicePixelRatio",
  "Intl.DateTimeFormat().resolvedOptions().timeZone",
];

export const DANGEROUS_PERMISSIONS = [
  "camera",
  "microphone",
  "geolocation",
  "notifications",
  "clipboard-read",
  "clipboard-write",
  "midi",
  "usb",
  "serial",
  "bluetooth",
];

