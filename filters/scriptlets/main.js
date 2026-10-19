(function () {
  const LOG = (ctx, msg, meta) => {
    try { chrome.runtime.sendMessage({ type: "log", level: "info", ctx, msg, meta }); } catch (e) {}
  };

  const YT_URL = /youtubei\/v1\/(player|get_watch|next|reel_watch_sequence|player?)/i;

  const strip = (obj) => {
    if (!obj || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) strip(obj[i]);
      return obj;
    }
    for (const k of Object.keys(obj)) {
      const lk = k.toLowerCase();
      if (lk.includes("ad") || lk.includes("ads") || lk.includes("break") || lk.includes("vast")) {
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
    } catch (e) { return origParse.call(this, text, reviver); }
  };

  const safeJson = (text) => {
    try {
      const obj = JSON.parse(text);
      strip(obj);
      return JSON.stringify(obj);
    } catch (e) { return text; }
  };

  // Fetch
  const origFetch = window.fetch;
  window.fetch = async function (input, init) {
    try {
      const url = typeof input === "string" ? input : input?.url;
      if (url && YT_URL.test(url)) {
        const resp = await origFetch.apply(this, arguments);
        const ct = resp.headers.get("content-type") || "";
        if (ct.includes("json") || ct.includes("javascript")) {
          const txt = await resp.clone().text();
          const mod = safeJson(txt);
          return new Response(mod, { status: resp.status, statusText: resp.statusText, headers: resp.headers });
        }
        return resp;
      }
    } catch (e) {}
    return origFetch.apply(this, arguments);
  };

  // XHR
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function () { this._url = arguments[1]; return origOpen.apply(this, arguments); };
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (body) {
    try {
      const url = this._url;
      if (url && YT_URL.test(url)) {
        const self = this;
        const origOnReady = self.onreadystatechange;
        self.onreadystatechange = function () {
          try {
            if (self.readyState === 4 && self.responseText) {
              const ct = self.getResponseHeader && self.getResponseHeader("content-type") || "";
              if (ct.includes("json") || ct.includes("javascript") || self.responseText.trim().startsWith("{") || self.responseText.trim().startsWith("[")) {
                const mod = safeJson(self.responseText);
                try { Object.defineProperty(self, "responseText", { value: mod, writable: false, configurable: true }); } catch (e) {}
                try { Object.defineProperty(self, "response", { value: mod, writable: false, configurable: true }); } catch (e) {}
              }
            }
          } catch (e) {}
          if (origOnReady) origOnReady.apply(self, arguments);
        };
      }
    } catch (e) {}
    return origSend.apply(this, arguments);
  };

  // Skip + cleanup
  const inc = () => { try { chrome.runtime.sendMessage({ type: "incBlock" }); } catch (e) {} };
  let obs;
  const start = () => {
    if (obs) return;
    obs = new MutationObserver(() => {
      try {
        document.querySelectorAll(".ytp-ad-skip-button, .ytp-skip-ad-button, button[aria-label*='Skip ad'], button[aria-label*='Skip']").forEach(b => { try { b.click(); inc(); } catch (e) {} });
        document.querySelectorAll(".ytp-ad-overlay-container, .ytp-ad-text-overlay, .ytp-ad-image-overlay, .ytp-ad-survey, .ytp-ad-message").forEach(el => { try { el.remove(); } catch (e) {} });
        document.querySelectorAll("ytd-ad-slot-renderer, .ytd-ad-slot-renderer, ytd-display-ad-renderer, ytd-promoted-video-renderer, .ytd-video-masthead-ad-v3-renderer, .sparkles-light-cta, .ytp-ad-module").forEach(el => { try { el.style.display = "none"; el.remove(); } catch (e) {} });
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
