# MyBlockYT

Personal, safe, minimal MV3 YouTube ad blocker with diagnostics logs. Zero telemetry, self-contained.

## Install (unpacked)
1. chrome://extensions → Developer mode
2. Load unpacked → select this folder
3. Open YouTube, test ads

## Features
- DNR rules for common ad domains
- MAIN-world scriptlet strips adPlacements/adSlots/playerAds etc
- Fetch/XHR interception for YouTube ad endpoints
- Auto-skip + hide overlays
- Ring-buffer logs with export (popup + window.__myblockyt_debug())
