(function () {
  const LOG = (ctx, msg, meta) => {
    try {
      chrome.runtime.sendMessage({ type: "log", level: "info", ctx, msg, meta });
    } catch (e) {}
  };

  const AD_KEYS = new Set([
    "adPlacements", "adSlots", "playerAds", "adBreakHeartbeatParams",
    "adClientParams", "isAd", "adSystem", "instreamAds", "externalAds",
    "ads", "ad", "vast", "playerConfig"
  ]);

  const strip = (obj) => {
    if (!obj || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) strip(obj[i]);
      return obj;
    }
    for (const k of Object.keys(obj)) {
      if (AD_KEYS.has(k)) {
        delete obj[k];
        continue;
      }
      strip(obj[k]);
    }
    return obj;
  };

  const origParse = JSON.parse;
  JSON.parse = function (text, reviver) {
    try {
      const v = origParse.call(this, text, reviver);
      strip(v);
      return v;
    } catch (e) {
      return origParse.call(this, text, reviver);
    }
  };

  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    try {
      const url = typeof input === "string" ? input : input?.url;
      if (url && /youtubei\/v1\/(player|get_watch|reel_watch_sequence|next)|get_video_info|initplayback|api\/stats\/ads|pagead|doubleclick|googlesyndication/.test(url)) {
        return Promise.resolve(new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } }));
      }
    } catch (e) {}
    return origFetch.apply(this, arguments);
  };

  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, async, user, pass) {
    this._url = url;
    return origOpen.call(this, method, url, async, user, pass);
  };
  XMLHttpRequest.prototype.send = function (body) {
    try {
      const url = this._url;
      if (url && /youtubei\/v1\/(player|get_watch|next)|get_video_info|initplayback|api\/stats\/ads/.test(url)) {
        Object.defineProperty(this, "response", { value: "{}", writable: false });
        Object.defineProperty(this, "responseText", { value: "{}", writable: false });
        Object.defineProperty(this, "status", { value: 200, writable: false });
        setTimeout(() => this.dispatchEvent(new Event("load")), 0);
        LOG("scriptlet", "xhr_intercept", { url });
        return;
      }
    } catch (e) {}
    return origSend.call(this, body);
  };

  const inc = () => { try { chrome.runtime.sendMessage({ type: "incBlock" }); } catch (e) {} };

  let obs;
  const start = () => {
    if (obs) return;
    obs = new MutationObserver(() => {
      try {
        document.querySelectorAll(".ytp-ad-skip-button").forEach((b) => { try { b.click(); inc(); } catch (e) {} });
        document.querySelectorAll(".ytp-ad-overlay-container, .ytp-ad-text-overlay, .ytp-ad-image-overlay, .ytd-ad-slot-renderer, .ytd-in-feed-ad-layout-renderer, .ytd-display-ad-renderer, .ytd-banner-promo-renderer, .ytd-video-masthead-ad-v3-renderer, .sparkles-light-cta, .ytp-ad-survey").forEach((el) => { try { el.remove(); el.style.display = "none"; } catch (e) {} });
      } catch (e) {}
    });
    obs.observe(document.body || document.documentElement, { childList: true, subtree: true });
  };
  const wait = () => (document.body ? start() : setTimeout(wait, 30));
  wait();

  window.__myblockyt_debug = () => {
    chrome.runtime.sendMessage({ type: "getLogs", limit: 300 }, (r) => console.log("[MyBlockYT]", r));
  };
})();
