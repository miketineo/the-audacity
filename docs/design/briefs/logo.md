# Brief: The Audacity logo (v2)

Design the new logo. Light-first, super-minimalist, confident. Read `../README.md` and `../BRAND.md` first. Invoke the `frontend-design:frontend-design` skill.

## The job

A mark + wordmark that signals a serious AI-first software house with audacity. Minimal and decisive, not busy. It has to survive everywhere: a 16px favicon, a hero, a dark footer, a monochrome stamp on an invoice.

## Concept territory (explore, do not copy)

The brand idea is **autonomous + audacious + engineering precision**. The name is "The Audacity," which is an attitude. Avoid the obvious robot/AI cliches (no brains, no circuit boards, no generic chat bubbles). Lean into confidence and craft.

## Hard requirements

- **Mark + wordmark**, plus a standalone mark that reads at favicon size.
- Works on **light and dark**, and in **pure monochrome** (one color, no gradients required to read).
- Vector first: deliver **SVG**. Prefer a single `currentColor` SVG so it themes automatically, plus explicit light/dark variants if needed.
- The one accent is lime `#C4FF00`, used sparingly. The logo must also be legible with zero accent (all ink).
- Clean at 16px. Test it tiny, not just big.

## Deliverables

- 2 to 3 **distinct** directions (different concepts, not three weights of one idea), each as rendered SVG on both light and dark, at 3 sizes (favicon, inline, hero).
- For the recommended direction, the production set: `logo.svg`, theme variant or `currentColor` version, `favicon.svg`, `favicon.ico`, apple-touch icon, and a regenerated `og-image.png` (1200x630) in the new minimalist brand.
- A short rationale per direction and a clear recommendation. Name the tradeoffs.

## Reference

- Existing v1 wordmark treatment lives in the root `index.html` (hero title). It is the thing we are moving past, useful as a "not this" reference.
- Bloop already has a polished mark for contrast/inspiration on craft level: `~/hack/miketineo/the-audacity/projects/bloop/assets/logo/bloop-mark.svg`.

## Acceptance

Distinctive (tells apart from any generic AI-agency logo), legible at 16px, correct on both themes, monochrome-safe, delivered as clean SVG with the full favicon/og set for the pick.
