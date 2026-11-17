#!/usr/bin/env bash
#
# deploy-pages.sh — deploy the built site to the Cloudflare Pages project
# `the-audacity`, per docs/specs/v2-promotion-checklist.md § "Direct-upload
# procedure". This is the committed form of that procedure; keep the two in
# step.
#
# Usage:
#   scripts/deploy-pages.sh <bundle-dir> preview-<topic>   # preview deployment
#   scripts/deploy-pages.sh <bundle-dir> main              # PRODUCTION + cache purge
#
# The bundle dir must hold v2/dist/* at its root, plus _redirects (v1/ was
# retired on 2026-11-11 and is no longer part of the bundle).
# Run from the REPO ROOT so wrangler picks up functions/ (the deploy log must
# show the Functions bundle uploading).
#
# Credentials come from Vault (secret/projects/atlas/cloudflare) and are only
# ever placed in this process's environment. Nothing is echoed.

set -euo pipefail

BUNDLE_DIR=${1:?usage: deploy-pages.sh <bundle-dir> <branch>}
BRANCH=${2:?usage: deploy-pages.sh <bundle-dir> <branch>}
ZONE_ID=afdcc29c67c775fcc01a765e0caa37b8   # theaudacity.io

test -f "$BUNDLE_DIR/_redirects" || { echo "bundle has no _redirects; wrong dir?" >&2; exit 1; }
test -d functions || { echo "run from the repo root: functions/ not found" >&2; exit 1; }

# wrangler needs Node >= 20.
NVM_NODE=$(ls -d "$HOME"/.nvm/versions/node/v2[0-9]* 2>/dev/null | sort -V | tail -1 || true)
[ -n "$NVM_NODE" ] && export PATH="$NVM_NODE/bin:$PATH"
node -e 'if (+process.versions.node.split(".")[0] < 20) { console.error("node >= 20 required"); process.exit(1) }'

# Scoped API token (Pages Write, Cache Purge, ...), IP-locked to atlas: this
# script only deploys when run on atlas. wrangler reads CLOUDFLARE_API_TOKEN.
export CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN=$(vault kv get -field=api_token secret/projects/atlas/cloudflare)
CLOUDFLARE_ACCOUNT_ID=$(vault kv get -field=account_id secret/projects/atlas/cloudflare)

npx -y wrangler pages deploy "$BUNDLE_DIR" --project-name=the-audacity --branch="$BRANCH"

if [ "$BRANCH" = "main" ]; then
  # The zone caches aggressively (see the 2026-08-04 incident in the spec):
  # purge the pages whose content changed or the old bytes keep serving.
  curl -sf -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    --data '{"files":["https://theaudacity.io/","https://theaudacity.io/index.html","https://www.theaudacity.io/"]}' \
    | python3 -c 'import json,sys; print("cache purge:", "ok" if json.load(sys.stdin)["success"] else "FAILED")'
fi
