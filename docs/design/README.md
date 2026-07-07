# The Audacity — Design Workspace (for Claude Design)

This folder is the entry point for any future **design** session on this repo. If you are a Claude session here to do visual / design work (logos, page proposals, screenshots, animated showcases, brand iterations), **read this file first, then the brief that matches your task.**

You have repo access. Use it. Look at the real code, the real assets, and the real product screenshots before proposing anything.

---

## Who The Audacity is (so your work has a point of view)

The Audacity is a serious AI-first software house. The studio builds and ships AI-first products fast: an AI agent platform does the acceleration, senior humans own the judgment. The two products that prove it are **Bloop** (AI events concierge for Bologna) and **Washiiba** (on-demand laundry for travelers).

The single most important strategic doc is the revenue + website spec. Read it before any page or brand work:

`docs/specs/2026-06-27-the-audacity-v2-revamp-spec.md`

The current brand source of truth is `docs/design/BRAND.md`. The current live site is the root `index.html` (v1, pitch-black brutalist). v2 moves to **light-first, super-minimalist** with a new logo and a light/dark/system theme toggle.

---

## The quality bar (non-negotiable)

Every proposal you produce must clear this bar. If it does not, do not present it.

1. **Use the official Anthropic frontend-design skill** (`frontend-design:frontend-design`) for every visual surface. This is mandatory, not optional. It exists to avoid generic AI aesthetics. Generic output is a failure.
2. **Distinctive, not template.** No stock-agency layouts, no default Bootstrap energy, no "AI startup landing page #4000." A stranger should be able to tell an Audacity surface from a competitor's at a glance.
3. **Production-grade, not a sketch.** Real type scale, real spacing system, real responsive behavior, real states (hover/focus/empty/error), real dark + light. Show, do not describe.
4. **Show, then justify.** Lead with the artifact (rendered HTML, SVG, a real mockup). Then a short rationale tied to the brand and the conversion goal. Never a wall of words with no artifact.
5. **Always propose 2 to 3 distinct directions**, not one. Different concepts, not three shades of the same idea. Name the tradeoff of each. Let Miguel pick.
6. **Respect the brand system** in `BRAND.md` (tokens, type, accent, light-first, minimal) unless you are explicitly proposing to evolve it, in which case say so loudly and show before/after.
7. **Accessible by default.** WCAG AA contrast in both themes, visible focus, reduced-motion paths for anything animated. A beautiful inaccessible proposal is rejected.

---

## How to work a design request here

1. Read this README, then `BRAND.md`, then the matching brief in `briefs/`.
2. Look at the real material: the v2 spec, the existing `index.html`, and the actual product assets (paths in `briefs/proof-showcase.md`).
3. Invoke the frontend-design skill.
4. Produce 2 to 3 distinct directions as **real rendered artifacts** (standalone HTML you can preview, SVG for logos/marks, short MP4/GIF or CSS-driven motion for animated screens).
5. To preview anything locally, use `local-deploy` and hand back an `https://<name>.local.test` URL. Never a bare `localhost:PORT`.
6. Present: artifact first, then a tight rationale and the pick recommendation.

---

## Hard writing/brand rules (inherited, do not break)

- Light-first, super-minimalist. Default theme is **light**. Lime `#C4FF00` is the single accent, used sparingly, never as a field.
- No person names at all on any public surface. The firm speaks for itself ("we", "the studio", "senior leadership"). Refer to collaborators by role.
- No em-dash phrase separators. No leading `>` / `|` blockquote markers in any copy Miguel will paste.
- Honest proof framing for Bloop and Washiiba: portfolio / proof-of-capability, never implied paying-client testimonials unless confirmed true.

---

## Briefs (pick the one that matches the task)

- `briefs/logo.md` — design the new Audacity logo (mark + wordmark, theme-aware, favicon to hero).
- `briefs/proof-showcase.md` — make Bloop and Washiiba look extraordinary: device mockups, screenshots, and animated screens that are visually high-impact.
- `briefs/page-proposals.md` — propose future page / section iterations to a production-grade bar.

If a request does not fit a brief, apply this README's quality bar and the brand system anyway.
