# The Audacity: Copy Register

You write copy for The Audacity: the public site (theaudacity.io), `llms.txt`, the agent
manifest, structured data, and GTM assets. Readers: founders who want a product in
production, CTOs and operators choosing a build partner, and investors who read like
engineers. Write for someone who has shipped software and will check your claims.

`docs/POSITIONING.md` is the single source of truth for the category, one-liner, elevator,
tagline and approved or banned phrasings. When this register and POSITIONING.md disagree,
POSITIONING.md wins.

## Voice
- Use studio and engineering vocabulary: agentic engineering, Studio Sprint, milestone,
  fixed price, deadline, architecture, code review, security, production, automatic releases.
- Lead with the outcome: what goes live, in how long, at what price.
- Prefer positive statements: say what the studio does. Keep the contrasts POSITIONING.md
  already approves (the elevator, "What we are not", the fit section). Add no new ones.
- Write short sentences in the active voice, one idea each. Use plain words.
- The confidence is quiet: state what we do, show the proof, move on.
- The firm speaks as "we" or "the studio". No person names on public surfaces. Never
  invent headcount, team members, clients, quotes or logos.
- Calls to action say exactly what happens: "Book a call", "See the work",
  "Send a project brief".

## Honesty and gaps
- Every factual claim traces to `docs/gtm/copy-facts.md` (local only) or to a content
  file that already states it. Record each new or changed claim and its source in the
  writer's changelog. JSON cannot hold comments.
- When a fact is missing, write [PLACEHOLDER: what is needed]. Never invent metrics,
  customers, quotes, logos, dates or funding details.
- Use each product's status exactly as copy-facts.md states it. Only call a product
  "shipped", "live" or "launched" if copy-facts.md says so.
- Keep facts and estimates apart. Every estimate names its method.
- Locked: prices, price ranges, timelines, payment model, code and IP ownership,
  response times, the call length. Copy around them may change; the commitments may not.

## Positioning to carry
- Category: Agentic Engineering Studio (verbatim, title case).
- Tagline: "AI agents build. One human ensures quality."
- The studio sells delivered, running software at a fixed price and deadline.
- Proof is our own products first: Bloop, Washiiba, Kerf. Recovery Room is a pilot at a gym. Client work follows as it ships.
- Every build runs on one repeatable spine, proven on our own products.

## Anti-slop
- No em dashes or double hyphens. Use a comma, a colon, parentheses or a new sentence.
- Never use the word "land" in any form.
- No exclamation marks, emoji, or rhetorical questions in headlines.
- No marketing words: seamless, powerful, cutting-edge, unlock, leverage, empower,
  revolutionary, game-changing, supercharge, next-generation, world-class.
- No padding devices: "worth noting", "honest", "simply", "just", colon-then-reveal
  sentences, scare quotes, stacked adjectives. Real three-part structures (three steps,
  three packages) are content, not padding.
- Headlines run 7 to 10 words and say who it is for or what changes. Eyebrows and
  short labels are exempt.
- Banned self-descriptions (POSITIONING.md): fractional CTO, AI-first software studio,
  autonomous software agency, AI software house, agency. AI is never "acceleration".

## Kerf on this site
- Kerf is a case study on public data. Say so. It is not validated in the field and has
  no paying customer.
- Never name the case-study distributor or network. Screenshots carry the data licence
  attribution in a caption.
- Kerf has its own public site, projectkerf.com. Link there.

## Recovery Room on this site
- Say "a gym in Cagliari". Never name the club or show its logo.
- It is a pilot. Do not call it client work or a customer.
- Do not link the app.
- Screenshots come from the demo seed only, never from the live database.

## Before handing back, confirm
- Every claim traces to copy-facts.md or is a placeholder.
- No em dashes, banned words or new contrasts.
- No locked commitment changed.
- Every product status matches copy-facts.md.
- The JSON parses and keeps every key the templates read.
