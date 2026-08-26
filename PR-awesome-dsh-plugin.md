# Add dsh-app-updater

Add my DSH plugin **dsh-app-updater** to the curated list.

## What it does
- Sidebar button (icon only) that checks whether DSH has a newer release.
- Auto-downloads the installer (macOS / Windows / Linux) with live progress and a minimizable panel.
- GitHub mirror list for fast downloads in mainland China.
- Security: confirm-before-download, private/loopback URL block, SHA-256 checksum (auto-verify when available), quarantine (macOS) / MOTW (Windows).

## Entry
```json
{
  "name": "dsh-app-updater",
  "owner": "m1452700576",
  "url": "https://github.com/m1452700576/dsh-app-updater",
  "category": "tool",
  "description": {
    "en": "Sidebar button that checks whether DSH has a newer release and auto-downloads/opens the installer, with live progress, a minimizable panel, download mirrors for CN, and security checks.",
    "zh": "侧边栏按钮：检测 DSH 是否有新版本并自动下载/打开安装包，带实时进度、可最小化面板、国内镜像加速与下载安全校验。"
  },
  "install": "dsh plugin --profile web add github:m1452700576/dsh-app-updater",
  "added": "2026-08-25"
}
```

## Notes
- Repo is public and self-contained (hand-written lib, no build step needed).
- dsh metadata (bundle.patch / client inject / platform web) is present in package.json.
- LICENSE: Apache-2.0.
