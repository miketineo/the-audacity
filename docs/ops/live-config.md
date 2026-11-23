# Live configuration outside this repo

Settings the site depends on that live in a dashboard or API instead of a
deployed file. Change them through the API and update this page in the same
session.

## Cloudflare zone theaudacity.io (`afdcc29c67c775fcc01a765e0caa37b8`)

### Redirect: www to apex (added 2026-11-16)

Phase `http_request_dynamic_redirect`, entrypoint ruleset
`b7df27f463a544b5a5bca5b3d93fe0e7`, rule `02888d5df9a6445e99b96f70e1f76313`.
Before it, `www.theaudacity.io` served the full site as a second host.

```json
{
  "description": "www.theaudacity.io -> theaudacity.io (canonical host, 2026-11-16)",
  "expression": "(http.host eq \"www.theaudacity.io\")",
  "action": "redirect",
  "action_parameters": {
    "from_value": {
      "status_code": 301,
      "target_url": { "expression": "concat(\"https://theaudacity.io\", http.request.uri.path)" },
      "preserve_query_string": true
    }
  },
  "enabled": true
}
```

Apply or restore with `PUT /zones/<zone>/rulesets/phases/http_request_dynamic_redirect/entrypoint`
and body `{"rules": [<rule above>]}`. The PUT replaces every rule in that phase.

## PostHog project "The Audacity" (EU, 160291)

- `cookieless_server_hash_mode = 2` (stateful), since 2026-11-16. Required by
  the cookieless mode in `v2/static/js/analytics.js` and the shared
  loader's `cookieless: true`. Without it PostHog drops every event from
  visitors who have not accepted cookies, and the site goes quiet.
- `anonymize_ips = true`.

## Cal.com event "Diagnostic call" (account `the-audacity-io`, event id 6241493)

Booked from the inline embed on /contact/ (`v2/templates/components/booking.html`).
Settings as of 2026-11-23 (the Stripe part is applied in the Cal.com dashboard,
not through this repo):

- Length 45 min (was 25), Google Meet link, day cap 3, qualifier question.
- Google Calendar connected: events go to miguel@miketineo.com.
- Payments: Cal.com Stripe app, connected through Stripe OAuth to the
  **TheAudacity** Stripe account (live), not Miketineo. "Collect payment on
  booking", EUR 175 (normally 250) until 30 November 2026. The slot confirms
  only after payment.
- The price is set in Cal.com and repeated in the site copy
  (`v2/data/pages.json`, `v2/data/faq.json`, `v2/static/llms.txt`). Change
  both together, or the site and the checkout disagree.
- The fee is credited against the project if the client goes ahead (handled
  on the first invoice, outside Stripe).

The EUR 250 payment link `plink_1UeuRYPXtXscVHuvaArmybW5`
(book.stripe.com/4gM14p2z93jz2hCaIcdfG02) was created on the Miketineo
account by mistake and is not used by the site; deactivate it once the Cal.com
flow is verified.
