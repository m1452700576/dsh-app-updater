#!/bin/bash
set -e
cd "$(dirname "$0")"
REPO_URL="$1"
if [ -z "$REPO_URL" ]; then REPO_URL="https://github.com/manxintai/dsh-app-updater.git"; fi
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"
echo "remote -> $REPO_URL"
echo "Create the repo on GitHub, then push with a Personal Access Token (not your account password):"
echo "    git push -u origin main"
echo "Or use SSH: git remote set-url origin git@github.com:manxintai/dsh-app-updater.git"
