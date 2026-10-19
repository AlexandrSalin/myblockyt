const manifest = chrome.runtime.getManifest();
document.getElementById("ver").textContent = "v" + manifest.version;
const logsEl = document.getElementById("logs");
const blockedEl = document.getElementById("blocked");

async function load() {
  chrome.runtime.sendMessage({ type: "stats" }, r => { if (r) blockedEl.textContent = r.blocked || 0; });
  chrome.runtime.sendMessage({ type: "getLogs", limit: 50 }, r => {
    if (r?.logs) {
      logsEl.textContent = r.logs.map(l => `${new Date(l.t).toLocaleTimeString()} [${l.level}] ${l.ctx}: ${l.msg}${l.meta?JSON.stringify(l.meta):""}`).join("\n");
    }
  });
}

document.getElementById("refresh").onclick = load;
document.getElementById("clear").onclick = () => { chrome.runtime.sendMessage({ type: "clearLogs" }, () => load()); };
document.getElementById("export").onclick = () => {
  chrome.runtime.sendMessage({ type: "getLogs", limit: 500 }, r => {
    const blob = new Blob([JSON.stringify(r?.logs||[], null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "myblockyt_logs.json"; a.click(); URL.revokeObjectURL(url);
  });
};
load();
