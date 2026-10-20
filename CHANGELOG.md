# Changelog

## 1.0.7
- Fix: removed overbroad DNR rule `googlevideo\.com/.*(oad|ad)` that matched
  legitimate videoplayback URLs and blocked video playback.
- Targeted JSON stripping only on player/watch/next/reel endpoints.
- Ignore Chrome-generated `_metadata/` directory.

## 1.0.0
- Initial release
