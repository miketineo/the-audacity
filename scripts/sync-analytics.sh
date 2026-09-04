#!/usr/bin/env bash
#
# sync-analytics.sh — push the canonical analytics module into the three
# vendored destinations and refresh its hash.
#
# npm needs a bundler miketineo.com does not have and a package.json washiiba's
# site does not have; submodules are fragile on Pages git-integration and need
# materializing for rsync. So: vendor one file, sync with this script, and let
# check-analytics.sh kill drift in CI.
#
# Run from anywhere: scripts/sync-analytics.sh
# Destinations that are not checked out on this machine are skipped with a note.
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
SRC="$ROOT/shared/analytics"

# The hash is generated here and vendored alongside the module, so a per-site
# edit fails assertion 1 in CI.
(cd "$SRC" && sha256sum posthog-setup.js > posthog-setup.js.sha256)

# Astro copies public/ verbatim; miketineo's CI copies js/; washiiba rsyncs
# site/public/. Each destination therefore needs the module, its hash and the
# guard script.
DESTS="
$ROOT/v2/public/analytics
$ROOT/../../miketineo.com/js
$ROOT/../projects/washiiba/site/public/assets
"

for dest in $DESTS; do
  parent=$(dirname "$dest")
  if [ ! -d "$parent" ]; then
    echo "skip: $parent not checked out here"
    continue
  fi
  mkdir -p "$dest"
  cp "$SRC/posthog-setup.js" "$SRC/posthog-setup.js.sha256" "$SRC/check-analytics.sh" "$dest/"
  echo "synced: $dest"
done

echo
echo "Vendored copies are generated. Never edit them — edit $SRC/posthog-setup.js"
echo "and re-run this script, then commit each repo separately."
