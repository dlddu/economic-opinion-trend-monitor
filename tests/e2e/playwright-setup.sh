#!/usr/bin/env bash
# Playwright setup for the e2e specs: npm ci + the Chromium build pinned by
# package-lock.json.
#
# The browser's OS packages (`--with-deps`, needs sudo) are only installed when
# CI=true: in the background there is no terminal to answer a sudo prompt. Run
# `npx playwright install-deps chromium` once locally if Chromium will not start.
# PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 skips `playwright install` altogether.
set -euo pipefail

cd "$(dirname "$0")"
npm ci
if [ "${PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD:-0}" != "1" ]; then
  if [ "${CI:-}" = "true" ]; then
    npx playwright install --with-deps chromium
  else
    npx playwright install chromium
  fi
fi
