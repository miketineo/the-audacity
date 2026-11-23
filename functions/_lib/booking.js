// Paid diagnostic call booking, shared by theaudacity.io and miketineo.com.
//
// Flow: GET /api/booking/slots -> POST /api/booking/hold (KV hold, returns the
// brand's Stripe Payment Link with client_reference_id=<holdId>) -> Stripe
// checkout -> POST /api/booking/webhook/<brand> (signature checked) -> Apps
// Script creates the calendar event with a Meet link and the booker as guest.
// An abandoned checkout leaves only an expiring hold: nothing is created.
//
// Rules: Mon to Fri, 09:00 to 17:00 Europe/Rome, 45-minute calls with a
// 15-minute buffer, at most 3 a day, from tomorrow up to 21 days ahead.

export const TZ = 'Europe/Rome';
export const CALL_MIN = 45;
export const BUFFER_MIN = 15;
export const DAY_START_H = 9;
export const DAY_END_H = 17;
export const DAILY_CAP = 3;
export const HORIZON_DAYS = 21;
export const HOLD_MIN = 20; // slot reserved while the booker pays
export const HOLD_RECORD_TTL_S = 3 * 24 * 3600; // record outlives the hold, for late webhooks

export const ALLOWED_ORIGINS = ['https://theaudacity.io', 'https://miketineo.com'];

// Public Stripe objects (Payment Link URLs are public by design). Filled in from
// the live objects created on each account; see docs/ops/live-config.md.
export const BRANDS = {
  audacity: {
    account: 'acct_1UJAotBTV7RTQ8BS',
    amount: 17500,
    link: { id: 'plink_1UeyWMBTV7RTQ8BSWcEtvpTu', url: 'https://book.stripe.com/dRm00i54Z8vy09y7Wicwg00' },
    testLink: { id: 'plink_1UeyWPBTV7RTQ8BS1CVsLk1h', url: 'https://book.stripe.com/bJedR8apj3be1dCfoKcwg01', amount: 100 },
  },
  miketineo: {
    account: 'acct_1SJYbHPXtXscVHuv',
    amount: 17500,
    link: { id: 'plink_1UeyWRPXtXscVHuvhZSORZ3e', url: 'https://book.stripe.com/cNi14p5Ll3jzaO85nSdfG03' },
  },
};

const pad = (n) => String(n).padStart(2, '0');

// Offset of TZ from UTC, in minutes, at the given instant.
export function tzOffsetMin(date, tz = TZ) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(date).map((p) => [p.type, p.value])
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return Math.round((asUtc - date.getTime()) / 60000);
}

// Wall-clock time in TZ -> Date.
export function zoned(y, m, d, h, min = 0, tz = TZ) {
  const guess = Date.UTC(y, m - 1, d, h, min);
  let off = tzOffsetMin(new Date(guess), tz);
  let t = guess - off * 60000;
  const off2 = tzOffsetMin(new Date(t), tz);
  if (off2 !== off) t = guess - off2 * 60000;
  return new Date(t);
}

// Calendar date in TZ: { y, m, d, dow } (dow 0 = Sunday).
export function zonedDate(date, tz = TZ) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
    }).formatToParts(date).map((x) => [x.type, x.value])
  );
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  return { y: +p.year, m: +p.month, d: +p.day, dow };
}

export const dayKey = (date) => {
  const z = zonedDate(date);
  return `${z.y}-${pad(z.m)}-${pad(z.d)}`;
};

// Every candidate slot in the booking window, before busy times are applied.
export function candidateSlots(now) {
  const today = zonedDate(now);
  const out = [];
  for (let i = 1; i <= HORIZON_DAYS; i++) {
    // Noon UTC of today + i keeps the date arithmetic clear of DST edges.
    const day = zonedDate(new Date(Date.UTC(today.y, today.m - 1, today.d + i, 12)));
    if (day.dow === 0 || day.dow === 6) continue;
    for (let h = DAY_START_H; ; h++) {
      const start = zoned(day.y, day.m, day.d, h);
      const end = new Date(start.getTime() + CALL_MIN * 60000);
      if (end > zoned(day.y, day.m, day.d, DAY_END_H)) break;
      out.push({ start, end });
    }
  }
  return out;
}

const overlaps = (a0, a1, b0, b1) => a0 < b1 && b0 < a1;

// Slots left after busy intervals (with the buffer), the daily cap and holds.
// busy: [{start, end}] ISO strings; booked: [{start}] diagnostic calls already
// on the calendar; holds: [{start}] active holds.
export function availableSlots(now, { busy = [], booked = [], holds = [] } = {}) {
  const perDay = {};
  const seen = new Set();
  for (const b of [...booked, ...holds]) {
    const t = new Date(b.start).getTime();
    if (seen.has(t)) continue; // a booked hold can show up in both lists
    seen.add(t);
    const k = dayKey(new Date(t));
    perDay[k] = (perDay[k] || 0) + 1;
  }
  const busyMs = busy.map((b) => [new Date(b.start).getTime(), new Date(b.end).getTime()]);
  const heldMs = new Set(holds.map((h) => new Date(h.start).getTime()));
  const buf = BUFFER_MIN * 60000;
  return candidateSlots(now).filter(({ start, end }) => {
    if ((perDay[dayKey(start)] || 0) >= DAILY_CAP) return false;
    if (heldMs.has(start.getTime())) return false;
    const s = start.getTime() - buf;
    const e = end.getTime() + buf;
    return !busyMs.some(([b0, b1]) => overlaps(s, e, b0, b1));
  });
}

export function isCandidate(now, startIso) {
  const t = new Date(startIso).getTime();
  if (!Number.isFinite(t)) return null;
  return candidateSlots(now).find((s) => s.start.getTime() === t) || null;
}

// ---- Stripe webhook signature (v1 scheme: HMAC-SHA256 of "<t>.<raw body>") ----

const enc = new TextEncoder();

async function hmacHex(secret, msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyStripeSignature(rawBody, header, secret, { toleranceS = 300, nowS = Math.floor(Date.now() / 1000) } = {}) {
  if (!secret || !header) return false;
  const parts = header.split(',').map((p) => p.split('='));
  const t = parts.find(([k]) => k === 't')?.[1];
  const sigs = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!t || !sigs.length || !/^\d+$/.test(t)) return false;
  if (Math.abs(nowS - Number(t)) > toleranceS) return false;
  const expected = await hmacHex(secret, `${t}.${rawBody}`);
  return sigs.some((s) => safeEqual(s, expected));
}

export { hmacHex as _hmacHexForTests };

// ---- Apps Script calendar backend ----

export async function callAppsScript(env, payload, fetchImpl = fetch) {
  if (!env.APPS_SCRIPT_URL || !env.APPS_SCRIPT_SECRET) throw new Error('apps_script_not_configured');
  const r = await fetchImpl(env.APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, secret: env.APPS_SCRIPT_SECRET }),
    redirect: 'follow',
  });
  const text = await r.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`apps_script_bad_response_${r.status}`);
  }
  if (!data.ok) throw new Error(`apps_script_${data.error || 'error'}`);
  return data;
}

// ---- KV holds (WAITLIST namespace, booking: prefix) ----

export const holdKey = (id) => `booking:hold:${id}`;
export const slotKey = (startIso) => `booking:slot:${new Date(startIso).toISOString()}`;

// Active holds, from the slot locks (TTL = hold length, so expired ones are gone).
export async function activeHolds(kv) {
  const out = [];
  let cursor;
  do {
    const page = await kv.list({ prefix: 'booking:slot:', cursor });
    for (const k of page.keys) out.push({ start: k.name.slice('booking:slot:'.length) });
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return out;
}

export function corsHeaders(request, methods = 'GET, POST, OPTIONS') {
  const o = request.headers.get('Origin');
  const h = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (ALLOWED_ORIGINS.includes(o)) h['Access-Control-Allow-Origin'] = o;
  return h;
}

export const json = (body, status, headers) => new Response(JSON.stringify(body), { status, headers });

export function parseBrand(v) {
  return Object.prototype.hasOwnProperty.call(BRANDS, v) ? v : null;
}

// Slack mrkdwn: neutralise <!channel>, <@user> and <url|label> in submitted text.
export function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function fmtRome(iso) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(iso)) + ' (Rome)';
}
