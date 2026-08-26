# dsh-app-updater

A DSH web plugin: a sidebar button (icon only) that checks whether DSH has a newer
release and, when one exists, auto-downloads the installer and opens it - with a live
progress bar and a minimizable panel.

## Features
- Sidebar icon-only button (tooltip "Check DSH update"), red dot when new version found.
- Probes known desktop-packaging repos (or your own githubRepo) for a newer release that
  ships a macOS installer (.dmg/.pkg/.zip).
- Auto-downloads the installer to ~/Downloads (or downloadsDir) and runs open.
- Live download progress (streaming bytes + percent), indeterminate bar when unknown.
- Panel can be minimized to a floating bubble while downloading.

## Install
    dsh plugin --profile web add github:manxintai/dsh-app-updater
    # or local link:  dsh plugin --profile web add link:$PWD
Then fully restart DSH.

## Config (entry config in cordis.patch.yml)
- sourceType: github (default) or npm
- githubRepo: your primary desktop-build repo, e.g. steven-kid/deepseek-harness-desktop
- downloadsDir: where the installer is saved (default ~/Downloads)

## Routes (loopback-only)
- GET  /api/dsh-update/status
- POST /api/dsh-update/download
- GET  /api/dsh-update/progress
