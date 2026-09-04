#!/usr/bin/env bash
#
# check-analytics.sh — CI guard for the vendored PostHog setup. Vendored
# alongside posthog-setup.js so every repo runs the same assertions.
#
#   check-analytics.sh <posthog-setup.js> <posthog-config.js> [page ...]
#
# Static assertions on source only. A headless-browser check on built output
# would need a build, a browser, consent-granting and network stubbing for three
# static sites — ~100 lines of Playwright and a permanent flake source. A
# post-deploy PostHog query has better signal but cannot fail a PR.
#
# Every failure prints a ::error:: annotation and the script exits non-zero.
set -euo pipefail

SETUP=${1:-}
CONFIG=${2:-}
if [ -z "$SETUP" ] || [ -z "$CONFIG" ]; then
  echo "usage: check-analytics.sh <posthog-setup.js> <posthog-config.js> [page ...]" >&2
  exit 2
fi
shift 2
PAGES=("$@")

fail=0
err() { echo "::error file=$1::$2"; fail=1; }

for f in "$SETUP" "$CONFIG"; do
  [ -f "$f" ] || err "$f" "file not found"
done
[ "$fail" -eq 0 ] || exit 1

# 1. No drift — the vendored module is byte-identical to the canonical one.
SUM="$SETUP.sha256"
if [ ! -f "$SUM" ]; then
  err "$SUM" "hash file missing next to the vendored module"
else
  expected=$(awk 'NR==1 {print $1}' "$SUM")
  actual=$(sha256sum "$SETUP" | awk '{print $1}')
  if [ "$expected" != "$actual" ]; then
    err "$SETUP" "drift: sha256 $actual != $expected — re-run scripts/sync-analytics.sh in the-audacity/website"
  fi
fi

# 2. The three options are forced on, matched verbatim.
while IFS= read -r line; do
  grep -qF "$line" "$SETUP" || err "$SETUP" "forced option missing: $line"
done <<'FORCED'
opts.autocapture = true;
opts.capture_pageview = true;
opts.capture_pageleave = true;
FORCED

# 3. No custom page_view unless the migration flag is still set.
if grep -qE "capture\(['\"]page_view['\"]" "$SETUP" "$CONFIG"; then
  grep -qF 'LEGACY_PAGEVIEW = true' "$SETUP" ||
    err "$SETUP" "custom page_view capture without LEGACY_PAGEVIEW = true"
fi

# 4. env is derived from the host, never hardcoded; release_id is stamped in CI.
if grep -nE "env: *['\"](production|prod)['\"]" "$SETUP" "$CONFIG"; then
  err "$CONFIG" "env is hardcoded — it must come from the host allowlist in posthog-setup.js"
fi
grep -qF '__RELEASE_ID__' "$CONFIG" ||
  err "$CONFIG" "__RELEASE_ID__ placeholder missing — release_id would ship stale"

# 5. The loader is actually on every page — the blind spot of source assertions.
# Callers pass the pages (or the single layout) that must reference the module.
if [ ${#PAGES[@]} -eq 0 ]; then
  echo "::notice::assertion 5 skipped: pass the pages that must load posthog-setup.js"
else
  for p in "${PAGES[@]}"; do
    if [ ! -f "$p" ]; then
      err "$p" "page not found"
    else
      grep -qF 'posthog-setup.js' "$p" || err "$p" "page does not load posthog-setup.js"
    fi
  done
fi

[ "$fail" -eq 0 ] || exit 1
echo "check-analytics: OK ($SETUP, $CONFIG)"
