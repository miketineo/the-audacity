# The Audacity — TODO

> **Last updated:** 2026-11-23
> **Overall health:** GREEN — v2 LIVE at theaudacity.io root; v1 retired 2026-11-11 (/v1/ redirects to /)
> **Active branch:** main

---

## North star

An **Agentic Engineering Studio** (see `docs/POSITIONING.md`) generating **revenue within 90 days**, proven by two shipped own-products: **Bloop** and **Washiiba**. The website is one surface of a sales motion, not the product. Lead offer: the **Studio Sprint** (AI-first product to production, priced).

---

## In Flight

- [x] `miguel` `cc+claude-fable-5` 2026-08-29 — Audit-block cross-link to miketineo.com/tech-due-diligence. Deployed to Pages production 2026-09-20 (preview verified first, cache purged, live check green) after the `tech-dd-page` flag rollout; deploy runs via `scripts/deploy-pages.sh` (new, the committed form of the promotion checklist's direct-upload procedure).

- [x] `miguel` `cc+claude-opus-5-5` 2026-11-03 — Copy refresh under `docs/copy/REGISTER.md` (facts in local-only `docs/gtm/copy-facts.md`) and Kerf added as the third own product on / and /work/ (overlapping desktop gallery). PR #43 merged, deployed to Pages production 2026-11-03, cache purged, live check green. Same release: security headers (`v2/public/_headers`: HSTS, pinned CSP, frame deny), form API refused on the bare pages.dev alias (`functions/api/_middleware.js`), and zone settings min TLS 1.2, SSL Full (strict), Always Use HTTPS, Free Managed WAF ruleset deployed explicitly.

- [x] `miguel` `cc+claude-opus-5-5` 2026-11-05: Waitlist and inquiry emails moved to the monochrome brand (no lime, no Impact, copy unchanged); `docs/design/BRAND.md` gains the "Generated output" tokens every agent generator reads. PR #44 merged, deployed to Pages production 2026-11-05, cache purged, live check green. Bundle diffed against live first: only the email functions changed.

- [x] `miguel` `cc+claude-fable-5-1` 2026-11-05: Blog section at /blog/ with the first essay, "The Audacity of Helium". Essays are Markdown files in `v2/src/blog/`, loaded with plain imports (Astro content collections reject the loose JSON files in `src/content/`). The studio is the author, no byline, per `docs/copy/REGISTER.md`. Blog link added to nav, footer and `llms.txt`. PR #46 merged, deployed to Pages production 2026-11-05 from atlas (preview first, bundle diffed against live: only the blog pages, the Blog links, `llms.txt` and the sitemap changed), live check green. Cache purged for every page, by hand for all but the home page: `scripts/deploy-pages.sh` still purges the home page only. On atlas the script ran with `node` and `npx` wrappers around a `node:22-bookworm-slim` container and Vault reads through the host proxy socket. LinkedIn post for the essay is in local-only `docs/gtm/linkedin-audacity-of-helium.md`, not posted.

- [~] `miguel` `cc+claude-opus-5-5` 2026-11-06: Recovery Room added to / and /work/ as a pilot at a gym in Cagliari, plus `llms.txt`, the agent manifest and the FAQ. No club name or logo, app not linked, screenshots from the demo seed. Merged; production deploy waits on a Vault login (`scripts/deploy-pages.sh`).

- [x] `miguel` `cc+claude-opus-5-5` 2026-11-11: Retire the v1 archive (the original black and lime site at /v1/): files removed, /v1/ 301 to /, CSP drops the v1-only labs.miketineo.com origin. PR #50 merged, deployed to Pages production 2026-11-11, cache purged, /v1/* 301 to / confirmed live.

- [x] `miguel` `cc+claude-sonnet-5-5` 2026-11-16: Dependabot alert sweep of `/v2`. Lockfile refresh (PR #52) closed 20 alerts and the built `dist` is byte-identical to a build of `main`; new `build` check on every PR (PR #51) because the gitleaks scan alone let broken bumps show green. Merged only, nothing deployed (the served bytes did not change). 33 alerts stay open (astro, vite, sharp, esbuild, zod): none has a patched release on the 4.x tree.

- [x] `miguel` `cc+claude-opus-5-5` 2026-11-17: Astro 4.16.19 to 7.4.12 and `@astrojs/sitemap` 3.7.5 (Dependabot #59 plus one fix), PR #61 merged, deployed to Pages production 2026-11-17 (preview first), every page purged, live check green. Dependabot alerts: 0 open (all 33 fixed). Lockfile 388 to 262 packages, `npm audit` clean, `npm audit signatures` verified. Astro 5+ renders boolean attributes as "true"/"false", which would have switched on the never-matched `[data-flip='true']` rule on /work/; the page emits `''` so the live layout is unchanged. Rendered text identical on every page, and 28 full-page screenshots (7 pages, 1440/390 px, light/dark) are pixel-identical to the Astro 4 build. PostHog still cookieless until consent (no cookies pre-consent on live). Builds now need Node >= 22.23.4 (the atlas recipe uses `node:22-alpine`). `scripts/deploy-pages.sh` no longer requires the retired `v1/`. Dependabot #5, #6, #57, #58, #59 closed as superseded; #4 (`actions/checkout` 4 to 7) stays open (workflow change, needs a push from the Mac).

- [x] `miguel` `cc+claude-fable-5-2` 2026-11-17: Site build moved from Astro 7 to Zola 0.23.6 (one Rust binary in a container pinned by digest, `scripts/zola build`), so the build installs no npm packages (was 262). Same site: every page has the same DOM, CSS rules and scripts as the Astro build (scope attributes renamed `data-astro-cid-*` to `data-s-<component>`), 28 full-page screenshots are pixel-identical, and cookies, storage, consent, theme, nav and third-party requests behave the same. Content stays data-driven (`v2/data/*.json`, `v2/content/blog/`). `/sitemap.xml` is now the sitemap; `/sitemap-index.xml` and `/sitemap-0.xml` redirect to it. `scripts/deploy-pages.sh` pins wrangler; Dependabot gets a 7-day cooldown. PR #62 merged, deployed to Pages production 2026-11-17 (preview first, wrangler 4.160.0), every page purged, live check green: 6 pages 200 with no Astro markup left, `/sitemap-index.xml` 301 to `/sitemap.xml`, form API healthy (403/204), no console errors, no cookies before consent. Build recipe on atlas is now `scripts/zola build` (docker only, no node); the deploy still needs the `node`/`npx` wrappers for wrangler. New essays go in `v2/content/blog/`; styles keep Astro's scoping as `data-s-<component>` attributes, so a new element inside a component needs that attribute to pick up its styles.

- [x] `miguel` `cc+claude-opus-5-5` 2026-11-23: Diagnostic call becomes paid: 45 min (was a free 25), EUR 175 until 30 November (normally 250), credited against the project, pay to book. Cal.com removed: our own Cal.com-style calendar picker (brand-reviewed) on /contact/#book and miketineo.com/contact.html#book, booking API in `functions/api/booking/` (KV holds, Stripe Payment Links per brand, signed webhooks), calendar events with Meet links through an Apps Script web app on miguel@miketineo.com. PRs #64, #65 (and miketineo.com #45, #46) merged, deployed to Pages production 2026-11-23, purged. EUR 1 live test passed end to end and was refunded; test token deleted. Live objects in `docs/ops/live-config.md`. 29 Nov: decide to extend EUR 175 or revert to 250 (Stripe price and copy together).

- [x] `miguel` `cc+claude-opus-5-5` 2026-11-23: Booking loading mark: the three booking status lines (loading open times, holding your time, opening the payment page) lead with the logo's `[ . ]` characters in three loops (scan, breathe, fill, Miguel picked B, C, D from five drafts), the next picked at random when one ends. Fixed 7ch width (text never moves), aria-hidden, still under reduced motion. PR #66 merged, deployed to Pages production 2026-11-23 (preview first, bundle diffed against live: only `js/booking.js` and `css/contact.css` changed), both files purged, live equals build. Same change on miketineo.com (#47, deployed to S3).

- [x] `miguel` `cc+claude-fable-5-2` 2026-11-23: Copy review applied. A Fable workflow (four readers, a fact miner over the Washiiba and Bloop repos, a register and fact checker, a founder read) flagged 129 lines; 55 changes shipped in PR #68. Bloop is "An AI concierge app that finds events and things to do in your city" (Bologna stays as the status); Washiiba is "A full marketplace platform with a customer app, a supplier portal and an admin back office", with automatic order routing and six languages; "one codebase" is gone from every surface; the same descriptors on home, work, FAQ, meta, `llms.txt`, the agent manifest and JSON-LD. No locked commitment changed. Deployed to Pages production 2026-11-23 (preview first), every changed URL purged, live equals build. Same day: inquiry and waitlist emails send through Amazon SES (PR #67).

- [x] `miguel` `cc+claude-fable-5-2` 2026-11-23: Washiiba build time on the Work page only, approved by Miguel: "The first working version of all three was built in eight weeks." Kept away from the offer and prices (eight weeks is longer than the Launch package). Also the same day (PR #69): hero strip rewritten as what the buyer gets, proof intro cut to three sentences, booked page without a personal address, `scripts/broadcast.js` on SES.

- [~] `miguel` `cc+claude-opus-5-5` 2026-11-24: **Call-price A/B test live** (PR #73). Every sentence quoting the call price shows one of three variants per page view, picked in the browser before first paint, nothing stored (`?price_ab=control|struck|animated` forces one): control "€175 until 31 December (normally €250)"; struck "€175 ~~€250~~" linking to the calendar; animated ~~€250~~ [€175] revealed once on scroll, linking to the calendar. Events on priced pages carry `price_variant`; read it with a PostHog funnel (page view, then `cta_clicked` / `book_call_checkout`) split by `price_variant`. Not PostHog flags: visitors without cookie consent get no stable id. Read the result by 30 December, keep the winner, remove the other two from `components/price.html`, `scripts/price-reveal.html`, `base.css`, the head script in `base.html` and `priceVariant()` in `analytics.js`.

- [ ] **30 December:** the EUR 175 call price is published as "until 31 December" (extended once from 30 November, Miguel 2026-11-23). Decide again by then: extend, or switch both Stripe Payment Links to EUR 250 and change the copy on both sites in the same change (`docs/ops/live-config.md`, section Price).

- [ ] Copy review, 10 items waiting on a decision (full table in local-only `~/reports/theaudacity-copy-review-2026-11-23.md`): the deposit amount, the free-fix period, what a retainer month delivers, what the Launch AI assistant does, a FAQ entry for non-technical founders, the six-agent roster in the agent manifest, the sender named on the booked page, and privacy wording for the mail path and retention periods.

---

## Status Summary

| Area | Status |
|------|--------|
| v2 site | ✅ LIVE at theaudacity.io root (promoted 2026-07-07, marketing test 8/10) |
| v1 | Retired 2026-11-11: removed from the site and the repo, /v1/ redirects to / (history in git) |
| v2 revamp spec | ✅ SHIPPED |
| Claude Design context pack | ✅ Written (`docs/design/`) |
| Analytics | ✅ PostHog live (consent-gated, via z.miketineo.com proxy) |
| Revenue motion (offer, outreach, pipeline) | ⏳ GTM assets in `docs/gtm/`, outreach not started |

---

## Pending — post-release

- [x] `claude` `claude-code` 2026-09-27 (SEC-11): approval gate shipped: the inquiry Slack ping carries a signed, single-use, 7-day link to `/api/inquiry-decision` (GET = confirm page only, POST approve/reject); Approve sends the fixed `emails/inquiry.js` template (no name, no submitter text), Reject records. Secret `INQUIRY_APPROVAL_SECRET` per Pages env, mirrored in Vault `secret/projects/theaudacity/inquiry-approval`. Sending stays OFF until RESEND_API_KEY exists (approve is a logged no-op). Tests: `node --test tests/*.test.mjs`. Original item: Inquiry auto-reply returns ONLY behind a human approval gate (Miguel 2026-09-27). Removed in `6a87cde` because it let anyone make theaudacity.io email any address, with an unescaped first name in the HTML (phishing relay, `functions/_lib/emails/inquiry.js:76`). Gate design: a submission posts an escaped summary to Slack/Telegram with Approve/Reject; Approve sends a FIXED template (no submitter-supplied text in the body) to the submitter. No LLM reads the submission on the way. Turnstile on the form is a prerequisite.
- [x] Booking live: Cal.com (`the-audacity-io/diagnostic-call`), theme-synced embed, book_call_completed wired (2026-07-07)
- [x] P.IVA in the footer imprint (IT04098710926, 2026-07-07)
- [x] All work committed + pushed to main (public repo; internal strategy docs gitignored), tag v2.0.0
- [ ] Start the outreach motion using `docs/gtm/` (target list, templates, follow-up, pipeline)
- [x] PostHog: option B live (`product` super property on theaudacity.io)
- [x] `miguel` `cc+claude-fable-5-2` 2026-11-23: Email sending live through Amazon SES (Resend was never provisioned and is removed). `functions/_lib/ses.js` signs SES API v2 requests itself, no dependencies. Send-only IAM user, From locked to obviously@theaudacity.io, production secrets only. Details in `docs/ops/live-config.md`.
- [ ] Instrument Washiiba / Bloop / miketineo.com with the shared PostHog key + their `product` values (when convenient)
- [x] Run the v2 build via ultracode
- [x] Pick a logo direction (C "bracketed period", monochrome)
- [x] Review v2 at `theaudacity.io/v2`
- [x] Promote v2 to root + archive v1 (2026-07-07)

## Pending — proof products (own)

- [ ] Bloop: continue MVP / launch
- [ ] Washiiba: decide commercial path (options tracked in private notes); keep specifics off all public surfaces

---

## Deferred (documented in spec §13)

- Paid ads + pixels (Google Ads, LinkedIn) and GTM container — structure for it, build later
- Service-line pages beyond the offer, platform page, About, blog — pulled by demand
- Public exact price cards — use "from €X" + private rate card

---

## Recently Completed

| Item | Actor | Via | PR/Commit | Date |
|------|-------|-----|-----------|------|
| v2 PROMOTED to production root; v1 archived at /v1/; www attached | miguel | cc+fable-5 | — | 2026-07-07 |
| CMO/CPO audit loop: marketing test 8/10; name removed from all public surfaces | miguel | cc+fable-5 | — | 2026-07-02 |
| v2 built (ultracode), corrections, monochrome rebrand, deployed to /v2 | miguel | cc+opus-4.8 | — | 2026-06-28 |
| v2 revenue-first revamp spec + Claude Design context pack | miguel | cc+opus-4.8 | — | 2026-06-27 |
| Landing page design + build (v1) | miguel | cc+opus-4.6 | — | 2026-04-12 |

---

## Reference

- v2 spec: `docs/specs/2026-06-27-the-audacity-v2-revamp-spec.md`
- Design workspace: `docs/design/` (README + BRAND + briefs)
- v1 brand spec: `docs/superpowers/specs/2026-04-12-the-audacity-landing-page-design.md`
- Files: `the-audacity/` in monorepo
