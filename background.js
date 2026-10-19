import { Logger } from "./lib/logger.js";

const logger = new Logger();
let blocked = 0;

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  (async () => {
    try {
      if (req?.type === "log") {
        await logger.log(req.level || "info", req.ctx || "bg", req.msg || "", req.meta || {});
        sendResponse({ ok: true });
        return;
      }
      if (req?.type === "stats") {
        sendResponse({ blocked });
        return;
      }
      if (req?.type === "incBlock") {
        blocked++;
        sendResponse({ blocked });
        return;
      }
      if (req?.type === "getLogs") {
        const logs = await logger.get(req.limit || 50);
        sendResponse({ logs });
        return;
      }
      if (req?.type === "clearLogs") {
        await logger.clear();
        sendResponse({ ok: true });
        return;
      }
      sendResponse({ ok: false });
    } catch (e) {
      sendResponse({ ok: false, error: String(e) });
    }
  })();
  return true;
});
