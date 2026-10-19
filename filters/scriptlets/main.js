(function() {
  const LOG = (ctx, msg, meta) => {
    try {
      if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type: "log", level: "info", ctx, msg, meta });
      }
    } catch (e) {}
  };

  const AD_KEYS = new Set(["adPlacements", "adSlots", "playerAds", "adBreakHeartbeatParams", "adClientParams", "isAd", "adSystem", "instreamAds", "externalAds", "ads", "ad", "vast", "playerConfig"]);
  
  const strip = (obj) => {
    if (!obj || typeof obj !== "object") return obj;
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
  JSON.parse = function(text, reviver) {
    try {
      const v = origParse.call(this, text, reviver);
      strip(v);
      return v;
    } catch (e) {
      return origParse.call(this, text, reviver);
    }
  };

  const origFetch = window.fetch;
  window.fetch = function(input, init) {
    try {
      const url = typeof input === "string" ? input : input?.url;
      if (url && /youtubei\/v1\/(player|get_watch|reel_watch_sequence)|get_video_info|initplayback|api\/stats\/ads|pagead|doubleclick|googlesyndication/.test(url)) {
        LOG("scriptlet", "fetch_intercept", { url });
        return Promise.resolve(new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } }));
      }
    } catch (e) {}
    return origFetch.apply(this, arguments);
  };

  const _sendMsg = (m) => { try { if (chrome?.runtime?.sendMessage) chrome.runtime.sendMessage(m); } catch (e) {} };

  let observer;
  const run = () => {
    if (observer) return;
    observer = new MutationObserver(() => {
      try {
        document.querySelectorAll(".ytp-ad-skip-button").forEach(b => { try { b.click(); _sendMsg({ type: "incBlock" }); } catch (e) {} });
        document.querySelectorAll(".ytp-ad-overlay-container, .ytp-ad-text-overlay, .ytp-ad-image-overlay, .ytd-ad-slot-renderer, .ytd-in-feed-ad-layout-renderer, .ytd-display-ad-renderer, .ytd-banner-promo-renderer, .ytd-video-masthead-ad-v3-renderer, .sparkles-light-cta").forEach(el => { try { el.style.display = "none"; el.remove(); } catch (e) {} });
      } catch (e) {}
    });
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    LOG("scriptlet", "observer_started");
  };

  const waitBody = () => {
    if (document.body) run();
    else setTimeout(waitBody, 50);
  };
  waitBody();

  window.__myblockyt_debug = () => {
    chrome.runtime.sendMessage({ type: "getLogs", limit: 200 }, r => {
      console.log("[MyBlockYT DEBUG]", r);
    });
  };
})();
