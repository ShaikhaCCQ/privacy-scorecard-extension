(function () {
  const detected = [];

  // Monitor Canvas fingerprinting
  const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function () {
    if (this.width > 16 && this.height > 16) {
      window.postMessage({ type: '__PRIVACY_FP__', api: 'canvas.toDataURL' }, '*');
    }
    return origToDataURL.apply(this, arguments);
  };

  const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
  CanvasRenderingContext2D.prototype.getImageData = function () {
    if (arguments[2] > 16 && arguments[3] > 16) {
      window.postMessage({ type: '__PRIVACY_FP__', api: 'canvas.getImageData' }, '*');
    }
    return origGetImageData.apply(this, arguments);
  };

  // WebGL
  const origGetParam = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function (param) {
    const fpParams = [0x1F00, 0x1F01, 0x1F02, 0x9245, 0x9246];
    if (fpParams.includes(param)) {
      window.postMessage({ type: '__PRIVACY_FP__', api: 'webgl.getParameter' }, '*');
    }
    return origGetParam.apply(this, arguments);
  };

  // Audio
  const origAudioContext = window.AudioContext || window.webkitAudioContext;
  if (origAudioContext) {
    const origCreateOscillator = origAudioContext.prototype.createOscillator;
    origAudioContext.prototype.createOscillator = function () {
      window.postMessage({ type: '__PRIVACY_FP__', api: 'audio.createOscillator' }, '*');
      return origCreateOscillator.apply(this, arguments);
    };
  }

})();