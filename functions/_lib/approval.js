// Human approval gate for the inquiry auto-reply (SEC-11).
//
// An accepted inquiry gets a signed link in its Slack ping. The link opens a
// confirmation page (GET never decides anything, so Slack's link unfurler can't
// consume it); the human then POSTs Approve or Reject. Approve sends a FIXED
// template to the stored address, with no submitter text in it. No LLM ever
// reads the submission on this path.
//
// Token = base64url(JSON {k: <KV key>, e: <expiry ms>}) + "." + base64url(HMAC-SHA256).
// The secret is INQUIRY_APPROVAL_SECRET on the Pages project (a different value per
// environment, mirrored in Vault secret/projects/theaudacity/inquiry-approval).
// Single use: the first decision is written to KV under DECISION_PREFIX + key and
// every later attempt is refused. KV has no compare-and-set, so two clicks within
// KV's propagation window could both pass; one approver in one Slack channel makes
// that acceptable for a courtesy email.

export const TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const DECISION_PREFIX = 'inquiry-decision:';

const enc = new TextEncoder();

function b64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unb64url(str) {
  const s = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

function sameBytes(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function mintToken(secret, kvKey, now = Date.now()) {
  const payload = b64url(enc.encode(JSON.stringify({ k: kvKey, e: now + TTL_MS })));
  return `${payload}.${b64url(await hmac(secret, payload))}`;
}

// Returns {ok: true, key} or {ok: false, reason}. Signature is checked before the
// payload is parsed, so nothing unauthenticated is ever interpreted.
export async function verifyToken(secret, token, now = Date.now()) {
  if (!secret) return { ok: false, reason: 'not_configured' };
  if (typeof token !== 'string' || token.length > 2048) return { ok: false, reason: 'malformed' };
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: 'malformed' };
  let sig;
  try {
    sig = unb64url(parts[1]);
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (!sameBytes(sig, await hmac(secret, parts[0]))) return { ok: false, reason: 'bad_signature' };
  let body;
  try {
    body = JSON.parse(new TextDecoder().decode(unb64url(parts[0])));
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (typeof body.k !== 'string' || !body.k.startsWith('inquiry:')) return { ok: false, reason: 'malformed' };
  if (typeof body.e !== 'number' || now > body.e) return { ok: false, reason: 'expired' };
  return { ok: true, key: body.k };
}
