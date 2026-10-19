(async () => {
  try {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("filters/scriptlets/main.js");
    script.async = false;
    (document.documentElement || document.head).appendChild(script);
    script.onload = () => { try { script.remove(); } catch (e) {} };
  } catch (e) {}
})();
