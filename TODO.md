# The Audacity — TODO

> **Last updated:** 2026-07-07
> **Overall health:** GREEN — v2 LIVE at theaudacity.io root; v1 archived at /v1/
> **Active branch:** main

---

## North star

A serious AI software house generating **revenue within 90 days**, proven by two shipped own-products: **Bloop** and **Washiiba**. The website is one surface of a sales motion, not the product. Lead offer: the **Studio Sprint** (AI-first product to production, priced).

---

## In Flight

*(nothing currently in flight)*

---

## Status Summary

| Area | Status |
|------|--------|
| v2 site | ✅ LIVE at theaudacity.io root (promoted 2026-07-07, marketing test 8/10) |
| v1 | ✅ Archived at /v1/ (and in repo `v1/`) |
| v2 revamp spec | ✅ SHIPPED |
| Claude Design context pack | ✅ Written (`docs/design/`) |
| Analytics | ✅ PostHog live (consent-gated, via z.miketineo.com proxy) |
| Revenue motion (offer, outreach, pipeline) | ⏳ GTM assets in `docs/gtm/`, outreach not started |

---

## Pending — post-release

- [ ] Booking URL: paste the Google Calendar appointment-schedule link into `v2/src/components/BookingEmbed.astro` (Book-a-call currently uses the email fallback)
- [ ] P.IVA in the footer imprint (art. 35 DPR 633/72) — needs Miguel's number + decision on legal-holder name on the imprint page
- [ ] Commit the whole v2 body of work (still uncommitted in the working tree)
- [ ] Start the outreach motion using `docs/gtm/` (target list, templates, follow-up, pipeline)
- [ ] PostHog: decide multiproject setup (A: paid per-product projects / B: free single project + `product` property)
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
