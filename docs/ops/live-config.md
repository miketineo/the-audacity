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

## Paid diagnostic call booking (since 2026-11-23)

Both contact pages (theaudacity.io/contact/#book and miketineo.com/contact.html#book)
use the slot picker in `v2/static/js/booking.js` (copied to miketineo.com `js/booking.js`).
The API is `functions/api/booking/` on this Pages project; rules and Payment Link ids are
in `functions/_lib/booking.js`. Cal.com is no longer used (event 6241493 can be deleted).

Flow: `GET /api/booking/slots?brand=` -> `POST /api/booking/hold` (20-minute hold in the
`WAITLIST` KV under `booking:`) -> Stripe Payment Link with `client_reference_id=<holdId>` ->
`POST /api/booking/webhook/<brand>` -> Apps Script creates the event. An abandoned checkout
creates nothing; a paid session whose hold is gone or whose slot was taken pings Slack.

### Stripe (live), one set per brand. Never mix them.

| | TheAudacity `acct_1UJAotBTV7RTQ8BS` | Miketineo `acct_1SJYbHPXtXscVHuv` |
|---|---|---|
| Product | `prod_VgLCEZbbyJZ8Rs` "Diagnostic call (45 min)" | `prod_VgGyibAJ6RwXcx` "Diagnostic call (45 min)" (existing product, renamed, description rewritten) |
| Price EUR 175 | `price_1UeyWABTV7RTQ8BSqvCjVlLM` | `price_1UeyWEPXtXscVHuvJrC7ayde` (default; the EUR 250 `price_1UeuQOPXtXscVHuvF7ZVZvZ6` is kept for the revert) |
| Payment Link | `plink_1UeyWMBTV7RTQ8BSWcEtvpTu` | `plink_1UeyWRPXtXscVHuvhZSORZ3e` |
| After payment | `https://theaudacity.io/contact/booked/` | `https://miketineo.com/booked.html` |
| Webhook | `we_1UeyWfBTV7RTQ8BSvycYcF0t` -> `/api/booking/webhook/audacity` | `we_1UeyWhPXtXscVHuv6aIeUQL7` -> `/api/booking/webhook/miketineo` |

TheAudacity also has a hidden EUR 1 test link (`plink_1UeyWPBTV7RTQ8BS1CVsLk1h`, product
`prod_VgLCsUHnJPPhV3`), used only when the hold carries `BOOKING_TEST_TOKEN`
(`/contact/?booking_test=<token>#book`; the button then reads "Pay €1 to book (test)").
The token is deleted after each test: set it again with `wrangler pages secret put`, redeploy
(secrets reach new deployments only), test, delete it, redeploy. Last test: 2026-11-23, passed
(payment, event with Meet link, confirmation email from miguel@theaudacity.io, Slack ping), refunded.

All three links accept `card` and `link` only (Apple Pay and Google Pay ride on card). The
webhook books only sessions that are `paid` at completion, so delayed methods (SEPA, bank
redirects) must stay off or a paid booking would be lost.

Automatic tax is off on both links (not decided). The stray EUR 250 link
`plink_1UeuRYPXtXscVHuvaArmybW5` on Miketineo is deactivated.

### Calendar backend: Google Apps Script

Project "Diagnostic call booking" in miguel@miketineo.com's Drive (script id
`1CNuhTGRuohFP-3GU9DRn4uuUXfuZqtJdfMzieVuh5zt0ZeNR8i07sgkX`), deployed as a web app
(execute as me, access anyone). Source: `scripts/booking-apps-script/` (paste into the
editor on change, then Deploy > Manage deployments > edit > New version, so the URL stays).
Events go on the primary calendar of miguel@miketineo.com with a Meet link, tagged with the
private extended property `audacityDiagnostic=1`. The Audacity bookers get
`sendUpdates=none` plus a confirmation with an .ics from miguel@theaudacity.io (Gmail
send-as); miketineo.com bookers get Google's own invite (`sendUpdates=all`).

### Pages secrets (project `the-audacity`)

`APPS_SCRIPT_URL`, `APPS_SCRIPT_SECRET` (= Script Property `SHARED_SECRET`),
`STRIPE_WEBHOOK_SECRET_AUDACITY`, `STRIPE_WEBHOOK_SECRET_MIKETINEO`, `BOOKING_TEST_TOKEN`.
Set with `wrangler pages secret put` (production, and preview for the first two).

### Price

EUR 175 until 30 November 2026, normally EUR 250. On 29 November decide: extend, or switch
both Payment Links to the EUR 250 price and change the copy (`v2/data/pages.json`,
`v2/data/faq.json`, `v2/static/llms.txt`, `data-price` in `components/booking.html`,
`amount` in `functions/_lib/booking.js`, and the miketineo.com pages) in the same change.
