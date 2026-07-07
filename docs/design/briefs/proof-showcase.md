# Brief: make Bloop & Washiiba look extraordinary

These two products are the proof that sells the Studio Sprint. Their showcase on the Work page has to be **visually high-impact**: the kind of device mockups, screenshots, and animated screens that make a founder think "I want mine to look like that." Read `../README.md` and `../BRAND.md` first. Invoke the `frontend-design:frontend-design` skill.

## The bar

Not raw screenshots dropped on a page. Composed, cinematic product presentation: device frames, depth, motion, considered crops, before/after of the real product surface. Apple-keynote energy, on a light-first minimalist canvas. Each product gets a presentation that takes 5 seconds to convey "this is a real, polished, shipped product."

## Honest framing (do not break)

Both are The Audacity's **own products**, framed as **portfolio / proof-of-capability**, never as paying-client testimonials. Use only metrics that are genuinely true (live app, real backend, store-ready). No invented logos, quotes, or numbers. No person names at all on public surfaces; the firm speaks as "we" / "the studio", and collaborators are referred to by role.

**Washiiba: keep it minimal.** Show it purely as proof the studio builds complete, production-grade products. Do not state its commercial status, roadmap, or any monetization/exit intent in any copy or caption. It is a capability receipt, nothing more.

**Bloop:** an own product in active MVP/launch. Lead on the live conversational concierge; fine to convey energy and momentum, but no invented traction numbers.

## The two products

**Bloop** — AI events concierge for Bologna. Conversational concierge over a live catalog (you chat, it proposes real events). Italian-first. Flutter app + Next.js back-office + Supabase + NVIDIA NIM. The hero motion is the **concierge conversation**: a real, friendly qualification that ends in real event cards.

Assets (real, use these):
```
~/hack/miketineo/the-audacity/projects/bloop/docs/screenshots/
  app-concierge.png   app-onboarding.png   app-feed.png   app-profile.png
  admin-discover.png  admin-events.png
~/hack/miketineo/the-audacity/projects/bloop/assets/logo/
  bloop-mark.svg  bloop-mark.png  bloop-icon.png  preview-on-midnight.png
```

**Washiiba** — on-demand laundry pickup/delivery for travelers. Flutter (iOS/Android/Web from one codebase) + Supabase. The hero motion is the **booking-to-tracking flow**: schedule a pickup, track the order, clean clothes delivered.

Assets (real, use these):
```
~/hack/miketineo/the-audacity/projects/washiiba/screenshots/
  desktop/01-auth-login.png 03-home.png 04-booking-address.png 05-booking-current.png 06-profile.png 07-tracking.png 08-profile-setup.png
  mobile/  (same set, phone aspect)
~/hack/miketineo/the-audacity/projects/washiiba/web/icons/   (app icons)
```

## What to produce

For each product, 2 to 3 distinct **presentation directions**, each as a real rendered artifact:

1. **Device mockups.** Phone frames for the Flutter screens, browser frames for the back-office/web. Real screenshots composited in, considered crops, depth/shadow consistent with the minimalist brand. SVG/HTML/CSS device frames preferred over heavy image editing where possible.
2. **Animated screens (the high-impact part).** Short, looping, purposeful motion that shows the product alive:
   - Bloop: the concierge chat typing out a qualification and resolving to event cards.
   - Washiiba: the booking flow advancing and the tracking state updating.
   - Implement as CSS/JS-driven motion in a standalone previewable HTML, or a short MP4/GIF if a real screen recording is cleaner. Always provide a **static fallback** and honor `prefers-reduced-motion`.
3. **The Work-page section** for each product: the composed block (mockup + animated screen + the honest one-liner of what it proves) as it would sit on `/v2/work/`, in both light and dark.

## Preview & deliver

Render real artifacts, not descriptions. Preview locally via `local-deploy` and return an `https://<name>.local.test` URL. Lead with the artifact, then a short rationale and a recommended direction per product.

## Acceptance

High-impact at a glance, real assets used, motion is purposeful with a reduced-motion fallback, both themes correct, framing honest, distinctly Audacity (not a generic app-showcase template).
