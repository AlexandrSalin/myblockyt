(function () {
  const LOG = (ctx, msg, meta) => {
    try { chrome.runtime.sendMessage({ type: "log", level: "info", ctx, msg, meta }); } catch (e) {}
  };

  const BAD_URL = /youtubei\/v1\/(player|get_watch|reel_watch_sequence|next)|get_video_info|initplayback|api\/stats\/ads|pagead|doubleclick|googlesyndication/i;

  // Block fetch/XHR only for ad endpoints
  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    try {
      const url = typeof input === "string" ? input : input?.url;
      if (url && BAD_URL.test(url)) {
        return Promise.resolve(new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } }));
      }
    } catch (e) {}
    return origFetch.apply(this, arguments);
  };

  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    this._url = url;
    return origOpen.apply(this, arguments);
  };
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (body) {
    try {
      const url = this._url;
      if (url && BAD_URL.test(url)) {
        Object.defineProperty(this, "response", { value: "{}", writable: false });
        Object.defineProperty(this, "responseText", { value: "{}", writable: false });
        Object.defineProperty(this, "status", { value: 200, writable: false });
        setTimeout(() => {
          try { this.dispatchEvent(new Event("load")); this.dispatchEvent(new Event("readystatechange")); } catch (e) {}
        }, 0);
        return;
      }
    } catch (e) {}
    return origSend.apply(this, arguments);
  };

  // Less aggressive stripping: only prune known ad arrays/objects
  const AD_KEYS = new Set(["adPlacements", "adSlots", "playerAds", "adBreakHeartbeatParams", "adClientParams", "instreamAds"]);
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
      if (k === "ads" && Array.isArray(obj[k])) {
        obj[k] = [];
        continue;
      }
      if (k === "ad" && obj[k] && typeof obj[k] === "object") {
        obj[k] = null;
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

  const inc = () => { try { chrome.runtime.sendMessage({ type: "incBlock" }); } catch (e) {} };

  let obs;
  const start = () => {
    if (obs) return;
    obs = new MutationObserver(() => {
      try {
        document.querySelectorAll(".ytp-ad-skip-button, .ytp-skip-ad-button").forEach((b) => { try { b.click(); inc(); } catch (e) {} });
        document.querySelectorAll(".ytp-ad-overlay-container, .ytp-ad-text-overlay, .ytp-ad-image-overlay, .ytp-ad-survey, .ytd-ad-slot-renderer, .ytd-in-feed-ad-layout-renderer, .ytd-display-ad-renderer, .ytd-banner-promo-renderer, .ytd-video-masthead-ad-v3-renderer, .sparkles-light-cta").forEach((el) => { try { el.remove(); el.style.display = "none"; } catch (e) {} });
      } catch (e) {}
    });
    obs.observe(document.body || document.documentElement, { childList: true, subtree: true });
  };
  const wait = () => (document.body ? start() : setTimeout(wait, 30));
  wait();

  window.__myblockyt_debug = () => {
    chrome.runtime.sendMessage({ type: "getLogs", limit: 400 }, (r) => console.log("[MyBlockYT DEBUG]", r));
  };
})();
