#!/usr/bin/env bash
# Playwright setup for the e2e specs: npm ci + the Chromium build pinned by
# package-lock.json. Needs neither the images nor the cluster, so callers run it
# in the background — run.sh from its first line, the CI e2e job from the top of
# the job (and hands run.sh the result through E2E_PLAYWRIGHT_SETUP_RC).
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
