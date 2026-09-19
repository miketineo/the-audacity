# Shared analytics module

The PostHog contract that `js/cookie-consent.js:10` has cited since April and
that nobody ever wrote. It lives here, in the website repo, rather than in a
`posthog-blueprint` repo of its own: a repo whose entire content is one JS file
and a README is ceremony, and the fact that it was already cited in a code
comment and a commit message despite never existing is that failure mode in
miniature.

## Two files per site, never one

| File | Who owns it |
|---|---|
| `posthog-setup.js` | Canonical, **byte-identical on every site**. Never edited per-site — CI asserts the sha256. |
| `posthog-config.js` | Per-site: project key, product name, release placeholder, consent adapter. |

That split is what makes everything else cheap. All the logic that could drift
lives in the file that cannot drift.

```
canonical:  shared/analytics/posthog-setup.js
            shared/analytics/posthog-setup.js.sha256
            shared/analytics/check-analytics.sh
            scripts/sync-analytics.sh

vendored →  v2/public/analytics/                  (Astro copies public/ verbatim)
         →  miketineo.com/js/                     (CI copies js/)
         →  washiiba/site/public/assets/          (rsync, no build step)
```

`shared/` sits at the repo root, outside Astro's build output, so Pages never
publishes it. `scripts/sync-analytics.sh` regenerates the hash and copies the
module, its hash and the guard into all three destinations.

## Install: the 4-line stub, then the module

```html
<script src="/analytics/posthog-config.js"></script>
<script src="/analytics/posthog-setup.js" defer></script>
```

`posthog-config.js` sets the config and the stub queue:

```js
window.__PH_CONFIG = {
  key: 'phc_...',
  product: 'miketineo',
  release_id: '__RELEASE_ID__',
  consent: {
    read: function () {
      try {
        var d = JSON.parse(localStorage.getItem('miketineo-cookie-consent') || 'null');
        return d ? !!d.accepted : null;   // true | false | null (undecided)
      } catch (e) { return null; }
    }
  }
};
window.phTrack    = function(){ (window.__PH_Q = window.__PH_Q || []).push(['capture'].concat([].slice.call(arguments))); };
window.phRegister = function(p){ (window.__PH_Q = window.__PH_Q || []).push(['register', p]); };
window.phConsent  = function(g){ (window.__PH_Q = window.__PH_Q || []).push(['consent', g]); };
```

Page code only ever calls `window.phTrack('inquiry_submitted', {...})`. The stub
removes every load-order assumption — the exact class of bug where a component
script bundled before the analytics script fires an event into nothing. On
execution the module overwrites the three globals and drains `window.__PH_Q`.

Config keys:

| Key | Meaning |
|---|---|
| `key` | The public `phc_` project key. Washiiba has its own project; the other two share 160291. |
| `product` | `theaudacity` \| `miketineo` \| `washiiba`. Registered as both `product` and `app`. |
| `release_id` | `'__RELEASE_ID__'` in source, stamped in CI. |
| `consent.read` | Returns `true` / `false` / `null` (undecided). |
| `consent.grantEvent` / `consent.denyEvent` | Optional CustomEvent names, for banners that signal by event. |
| `init` | Optional PostHog options. Merged **under** the defaults-then-forced options below. |
| `legacy_page_view` | Opt in to the custom `page_view` during the retirement soak. See below. |

## Consent: adapt, do not converge

Each site keeps its own storage format and supplies a small `read()` adapter.
The formats live on **different origins** and `localStorage` is origin-scoped,
so `audacity-consent` and `miketineo-cookie-consent` can never collide.
Converging them buys nothing and forces a re-prompt of every currently-consented
visitor — which is exactly the bug that silenced theaudacity.io's four
conversion events on 2026-07-07.

Both signalling paths are supported and each site uses one: a banner either
names its CustomEvents in `consent.grantEvent` / `consent.denyEvent`, or calls
`window.phConsent(true)` directly.

Events fired before consent are **buffered in memory, not dropped**, and
replayed in order once consent is granted and PostHog has loaded. Nothing
leaves the browser pre-consent and the queue dies with the page. A denial
clears the queue and calls `opt_out_capturing()`.

## Environment: exact-host allowlist, skip off production

`envFor()` matches the hostname **exactly**. A suffix match on `miketineo.com`
would re-admit `bear-draft.miketineo.com`, which is the leak being closed, so
`washiiba.miketineo.com` is enumerated explicitly rather than inherited.

Off production the module does not initialise at all — it does not tag events
`env: preview` and leave every future query to remember a filter. At ~100
pageviews per 90 days, preview traffic is Miguel and his agents: a majority of
the dataset, not a rounding error. Consequence, as intended: `*.local.test` bear
previews and `bear-draft.miketineo.com` go silent with no change to
`scripts/bear`.

Escape hatch: `localStorage.setItem('ph-debug', '1')` forces init on any host.

## release_id

The placeholder lives in `posthog-config.js`, never in `posthog-setup.js` — that
is what keeps the shared file byte-identical. CI stamps it:

```yaml
- name: Stamp release_id
  run: |
    set -euo pipefail
    F=_deploy/js/posthog-config.js
    grep -q '__RELEASE_ID__' "$F" || { echo "::error::placeholder missing in $F"; exit 1; }
    sed -i "s/__RELEASE_ID__/${GITHUB_SHA:0:7}/" "$F"
```

The `grep` before the `sed` is load-bearing: it fails loudly if the placeholder
is renamed, instead of silently shipping a literal token forever — which is
exactly how `1.0.0+b2aaeff` went three months stale. theaudacity.io needs no CI
step; Pages sets `CF_PAGES_COMMIT_SHA` during `astro build` and Astro frontmatter
runs in Node, so `Base.astro` inlines `__PH_CONFIG` directly. If a stamp is
missed the module reports `release_id: 'unstamped'` rather than the raw token.

## `app` vs `product`

Three surfaces, two property names today: miketineo.com registers
`app: 'miketineo'`, theaudacity.io registers `product: 'theaudacity'`, Pappa!
registers `app: 'pappa'`. The module registers **both keys with the same value**
for one cycle. Existing insights filtering `app = miketineo` keep working, new
ones use `product`, and zero dashboards break on ship day. Drop `app` once no
saved insight references it. One redundant property per event is far cheaper
than a rename-and-backfill.

## The three forced options

```js
var opts = Object.assign({}, DEFAULTS, cfg.init || {});
opts.autocapture = true;
opts.capture_pageview = true;
opts.capture_pageleave = true;
```

Site overrides merge first, then these three are forced. They are
non-overridable **by construction**, so the guard checks one file instead of
policing every site config. `check-analytics.sh` greps for those three lines
verbatim; do not reformat them.

## The asset proxy and its fallback

The library loads from `https://z.miketineo.com/static/array.js`, with an
`onerror` fallback to `https://eu-assets.i.posthog.com/static/array.js`. The
proxy stays primary because beating adblockers is its whole point, but a VPS
outage now costs adblocker-resistance rather than total silent death. Nothing
more: no retry, no timeout, no failover machinery. CI cannot catch a runtime
failure, so a `curl -fsS https://z.miketineo.com/static/array.js` belongs on an
existing cron.

The upstream snippet builds the asset URL as
`api_host.replace('.i.posthog.com', '-assets.i.posthog.com')`, which against a
proxy host is a no-op that reads like it does something. It is deleted here.

## The CI guard

```bash
bash js/check-analytics.sh js/posthog-setup.js js/posthog-config.js index.html blog/*.html
```

Five assertions, all static on source:

1. **No drift** — sha256 of the vendored module matches the vendored `.sha256`.
2. **The three options are forced on**, matched verbatim.
3. **No custom `page_view`** unless `LEGACY_PAGEVIEW = true` is still set.
4. **`env` is never hardcoded**, and `posthog-config.js` still carries
   `__RELEASE_ID__`.
5. **The loader is on every page** — pass the pages (or the one layout) as extra
   arguments. theaudacity.io passes `v2/src/layouts/Base.astro`; miketineo.com
   passes its HTML; washiiba passes `site/public/**/*.html`.

## Retiring the legacy `page_view`

theaudacity.io keeps its hand-rolled `page_view` alongside the restored
`$pageview` for one soak cycle, opted in per-site with
`legacy_page_view: true`. Retire it when the trailing-7-day `$pageview` count is
within 5% of `page_view`, **or** after 14 days, whichever is later. Then, in one
commit: rebuild the saved insights on `$pageview`, set `LEGACY_PAGEVIEW = false`,
delete the guarded emit in `loaded()`, re-sync and re-hash. Assertion 3 rejects
any reintroduction from then on.

## Changing the module

1. Edit `shared/analytics/posthog-setup.js` here.
2. Run `scripts/sync-analytics.sh` — it re-hashes and copies into all three
   destinations it can find on this machine.
3. Commit each repo separately. There is no monorepo and three repos is the
   whole reason the hash check exists.
