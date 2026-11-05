# The Audacity — Brand System (v2)

The canonical visual reference for v2. Read alongside `README.md`. This is the system every proposal derives from. If you propose to evolve it, say so explicitly and show before/after.

Positioning (category, mission, definitions, approved and banned phrasings): `docs/POSITIONING.md` is the single source of truth.

Direction: **light-first, super-minimalist, confident.** Seriousness comes from whitespace, typographic hierarchy, and restraint. Attitude lives in the words and one accent, not in a heavy canvas.

---

## Color tokens

All color flows through CSS custom properties so light and dark derive from one source. Default theme is **light**.

```
                 Light (default)        Dark
--bg             #FAFAF8               #0B0B0C
--surface        #FFFFFF               #141416
--text           #0E0E10               #ECECEC
--text-dim       #5B5B5F               #9A9A9F
--border         #ECECEA               rgba(255,255,255,.08)
--accent         #0E0E10 (light) / #ECECEC (dark)  — MONOCHROME ink, flips per theme
--accent-ink     #FAFAF8 (light) / #0B0B0C (dark)  — sits ON the accent
```

Accent rules (UPDATED 2026-06-27): the brand is **monochrome for now**. The lime was dropped; the accent is ink, so a primary CTA is a black fill on light / white fill on dark, and focus/marks are ink. Use the accent for one job at a time (a primary CTA, a focus ring, a key mark). Never as a background field. Keep contrast AA+ in both themes. A color accent may be re-introduced later: it lives entirely in the `--accent` / `--accent-ink` tokens, so a future swap is a two-line change. If a proposal wants color, propose it explicitly against these tokens, do not scatter hex values.

---

## Typography

- **Display:** Big Shoulders Display (900) for hero and large display moments only. Do not set body copy in it.
- **Body:** Inter. Replaces v1's all-mono body.
- **Accent/eyebrow/code:** Space Mono survives here (labels, eyebrows, code, metadata), not for body.
- Self-host or `font-display: swap`. No layout shift. Establish a real modular type scale, do not hand-pick sizes per element.

---

## Theme toggle (required behavior)

Light / dark / system, default light. Header on every page. Persists to `localStorage`. Honors `prefers-color-scheme` in system mode. No flash of the wrong theme (an inline head script sets the theme class before first paint). Any animated or color-dependent proposal must be checked in both themes.

---

## Logo (CHOSEN 2026-06-27)

**Direction C "Bracketed period"** — engineering brackets framing a period: `[.]` THE AUDACITY. Monochrome (currentColor), no accent color. Canonical source `v2/public/logo.svg`; inline component `v2/src/components/Logo.astro` (default `direction="c"`); favicon `v2/public/favicon.svg` uses a bolder mark tuned for 16px. Raster set generated: `og-image.png`, `apple-touch-icon.png`, `favicon.ico`. Mark + wordmark, works light/dark/monochrome, 16px favicon to hero, all SVG.

---

## Layout & motion

- Generous whitespace, strong hierarchy, few elements per view. Let things breathe.
- Grid-disciplined. Consistent spacing scale. Alignment is visible and intentional.
- Motion is purposeful only (focus, reveal, feedback). No decorative animation loops. Respect `prefers-reduced-motion` with a static fallback for everything that moves.
- Fast and quiet. Performance is part of the aesthetic. Clean Core Web Vitals.

---

## Generated output (emails, reports, dashboards, PDFs)

The one place agents take the brand from. Anything a template, ritual, skill or persona generates uses these values and points back here instead of carrying its own palette. Source of truth for the hex values: `v2/src/styles/global.css`.

```
                 Light (default)   Dark
bg               #FAFAF8           #0B0B0C
surface          #FFFFFF           #141416
surface-2        #F4F4F1           #1C1C1F
ink / accent     #0E0E10           #ECECEC
ink on accent    #FAFAF8           #0B0B0C
dim              #5B5B5F           #9A9A9F
border           #ECECEA           rgba(255,255,255,.08)
border-strong    #D9D9D4           rgba(255,255,255,.16)
```

**Status is monochrome.** Black and white only, so no red, amber or green: weight and fill carry the level, and a word or glyph always says it too.

```
Level                Fill and border               Glyph (Slack, plain text)
ACT / high           solid ink, bg-coloured text   ●
WATCH / medium       ink outline, ink text         ◐
ON TRACK / low       border-strong outline, dim    ○
NO FEED / none       no border, dim text           ·
```

Slack attachment bars use dim `#5B5B5F`, because ink disappears on Slack's dark theme.

**Fonts by medium.**

- Web pages and PDFs: Big Shoulders Display 900 for the title and one hero figure, in the case it was written (never forced to uppercase). Inter for body. Space Mono for small labels.
- Email: no webfonts, because Gmail strips them and the fallback was Impact. Sans `Inter,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif` for everything including headings, mono `ui-monospace,'SFMono-Regular',Menlo,Consolas,'Courier New',monospace` for small labels only. Never Impact, never Arial Narrow. Email is light only: `<meta name="color-scheme" content="light">`.

**Logo.** Direction C. Inline `v2/public/logo.svg` where SVG renders (web pages, PDFs). Email clients drop SVG, so email sets the mark as text: `[.] THE AUDACITY` in the mono stack.

**Retired, do not generate.** Lime `#C4FF00`, the pitch-black canvas (`#080808`, `#0A0A0A`), red and amber badges and accent bars, Impact, forced-uppercase display headlines, `//` section labels, noise textures, glows.

**One exception.** A data scale that means something in its own domain may keep its colours, such as the severity bands on a Kerf span map. That colour belongs to the data, not to the brand, and it never styles chrome.

---

## Voice in visuals

Dry, bold, confident, allergic to corporate hedge. The copy carries the audacity so the canvas can stay calm. Outcome-led, not feature-led. The visual job is to make a serious buyer trust the studio in seconds and book a call.

---

## Do / Don't

Do: light-first calm surfaces, monochrome ink discipline, real states, distinctive type treatment, honest product proof, both themes always.

Don't: pitch-black-everything (that was v1), reintroduce color ad hoc (the accent is a token decision, not a sprinkle), gradient soup, stock-agency hero layouts, decorative motion, generic AI-startup aesthetics, fake testimonials, em-dashes in copy, person names of any kind on public surfaces (the firm speaks as "we" / "the studio").
