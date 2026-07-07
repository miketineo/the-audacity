# Brief: future page & section proposals

For any new page, section, or visual iteration on The Audacity site. Read `../README.md` and `../BRAND.md` first. Invoke the `frontend-design:frontend-design` skill.

## Operating principle

The site is a sales surface for the Studio Sprint offer (see `docs/specs/2026-06-27-the-audacity-v2-revamp-spec.md`). Every page proposal serves one of: make the offer clear, make it trusted (via Bloop/Washiiba proof), or get the booking. If a proposal does not do one of those, cut it.

The v2 site ships thin first: Home, Work, Contact. Everything else (service-line pages, platform narrative, About, blog) is **pulled by real demand**, not pushed. When demand calls for a new page, this brief governs how to propose it.

## How to propose

1. State the conversion job of the page in one sentence.
2. Produce 2 to 3 **distinct** layout directions as real rendered HTML (previewable, both themes, responsive), not wireframe descriptions.
3. Show real states: default, hover/focus, empty, error, loading where relevant.
4. Tie each direction back to the brand system and the conversion job. Name the tradeoff. Recommend one.
5. Preview via `local-deploy`, return an `https://<name>.local.test` URL.

## Standing quality bar

Distinctive (not a generic agency template), production-grade (real type scale, spacing system, responsive, accessible AA in both themes), light-first minimalist, one decisive accent, purposeful motion only with reduced-motion fallback. Copy follows the voice rules: outcome-led, dry, confident, no em-dashes, no blockquote markers, no person names at all on public surfaces (the firm speaks as "we" / "the studio").

## Useful context to read before proposing

- `docs/specs/2026-06-27-the-audacity-v2-revamp-spec.md` — the offer, the proofs, the conversion surfaces, the IA.
- `BRAND.md` — tokens, type, theme, motion.
- The root `index.html` — v1, the thing we are evolving past (useful as "not this").

## Acceptance

A buyer lands, understands the offer, trusts it via the proof, and can book a call, on a surface that is unmistakably Audacity and clears the production-grade bar in both themes.
