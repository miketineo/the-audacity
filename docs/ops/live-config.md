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
  the cookieless mode in `v2/src/components/Analytics.astro` and the shared
  loader's `cookieless: true`. Without it PostHog drops every event from
  visitors who have not accepted cookies, and the site goes quiet.
- `anonymize_ips = true`.
