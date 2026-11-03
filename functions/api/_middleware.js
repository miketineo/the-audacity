// The bare pages.dev alias serves the production deployment but sits outside
// the theaudacity.io zone, so the zone WAF and the SEC-10 rate limit never see
// it. The form API answers only on the real domain (and on preview aliases,
// which run the preview environment).
const BARE_PAGES_HOST = 'the-audacity.pages.dev';

export async function onRequest(context) {
  if (new URL(context.request.url).hostname === BARE_PAGES_HOST) {
    return new Response(JSON.stringify({ ok: false, error: 'wrong_host' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return context.next();
}
