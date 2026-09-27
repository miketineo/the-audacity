// Shared intake guard for the public form endpoints (SEC-9, SEC-10).
//
// verifyTurnstile: the forms carry a Cloudflare Turnstile token; without a valid
// one the submission is refused. Fails closed: a missing TURNSTILE_SECRET refuses
// everything rather than silently letting bots through.
//
// origin: what the edge knows about the sender, stored next to every submission so
// an incident can be investigated after Cloudflare's short analytics retention has
// expired (the 2026-09-26 inquiry was traced only because the logs were still fresh).

export async function verifyTurnstile(token, secret, ip) {
  if (!secret) return { ok: false, reason: 'turnstile_not_configured' };
  if (!token || typeof token !== 'string') return { ok: false, reason: 'missing_token' };
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token.slice(0, 2048));
  if (ip) form.append('remoteip', ip);
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
    const data = await r.json();
    return data.success
      ? { ok: true, hostname: data.hostname || '' }
      : { ok: false, reason: (data['error-codes'] || ['rejected']).join(',') };
  } catch {
    return { ok: false, reason: 'siteverify_unreachable' };
  }
}

export function origin(request) {
  const h = request.headers;
  const cf = request.cf || {};
  const cap = (v, n = 300) => (typeof v === 'string' ? v.slice(0, n) : v ?? null);
  return {
    ip: cap(h.get('cf-connecting-ip'), 64),
    country: cap(cf.country, 8),
    region: cap(cf.region, 80),
    city: cap(cf.city, 80),
    asn: cf.asn ?? null,
    as_org: cap(cf.asOrganization, 120),
    colo: cap(cf.colo, 8),
    ray: cap(h.get('cf-ray'), 64),
    user_agent: cap(h.get('user-agent')),
    referer: cap(h.get('referer')),
    accept_language: cap(h.get('accept-language'), 120),
    tls_version: cap(cf.tlsVersion, 16),
    http_protocol: cap(cf.httpProtocol, 16),
  };
}

// capture: forensic copy of every submission (SEC-9 part 2). The raw request body
// plus origin metadata goes to the FORENSICS R2 bucket under
// forms/<endpoint>/<yyyy-mm-dd>/<ray>.json, for accepted AND refused requests, so a
// bot run can be reconstructed byte for byte later. Fire-and-forget via waitUntil:
// a storage failure is logged and never touches the response. The functions only
// ever put(); nothing here reads the bucket back. No binding = no-op.
export function capture(context, endpoint, raw, sender, outcome) {
  const bucket = context.env.FORENSICS;
  if (!bucket) return;
  const now = new Date().toISOString();
  const id = (sender.ray || '').replace(/[^A-Za-z0-9-]/g, '') || crypto.randomUUID();
  const key = `forms/${endpoint}/${now.slice(0, 10)}/${id}.json`;
  const body = JSON.stringify({
    endpoint,
    received_at: now,
    outcome,
    origin: sender,
    raw: typeof raw === 'string' ? raw.slice(0, 65536) : null,
  });
  context.waitUntil(
    bucket
      .put(key, body, { httpMetadata: { contentType: 'application/json' } })
      .catch((err) => console.error('forensic_capture_failed', endpoint, err?.message || err))
  );
}
