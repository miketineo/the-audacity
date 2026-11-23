import {
  BRANDS, HOLD_MIN, HOLD_RECORD_TTL_S, availableSlots, activeHolds, callAppsScript, corsHeaders,
  holdKey, isCandidate, json, parseBrand, safeEqual, slotKey,
} from '../../_lib/booking.js';
import { origin } from '../../_lib/guard.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_HOLDS_PER_IP = 2;

// POST /api/booking/hold {brand, start, name, email, agenda, test?}
// Reserves the slot for HOLD_MIN minutes and returns the brand's Payment Link.
// Nothing reaches the calendar until Stripe reports the payment (webhook).
export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = corsHeaders(request);
  const kv = env.WAITLIST;

  let body;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return json({ ok: false, error: 'invalid_body' }, 400, headers);
  }
  const brand = parseBrand(body.brand);
  const name = String(body.name || '').trim().slice(0, 100);
  const email = String(body.email || '').trim().toLowerCase().slice(0, 200);
  const agenda = String(body.agenda || '').trim().slice(0, 1500);
  if (!brand) return json({ ok: false, error: 'invalid_brand' }, 400, headers);
  if (!name) return json({ ok: false, error: 'invalid_name' }, 400, headers);
  if (!EMAIL_RE.test(email)) return json({ ok: false, error: 'invalid_email' }, 400, headers);
  if (!agenda) return json({ ok: false, error: 'invalid_agenda' }, 400, headers);

  const now = new Date();
  const slot = isCandidate(now, body.start);
  if (!slot) return json({ ok: false, error: 'invalid_slot' }, 400, headers);
  const startIso = slot.start.toISOString();

  // The secret test token switches The Audacity to the EUR 1 test link.
  const test = Boolean(body.test) && brand === 'audacity' && safeEqual(String(body.test), env.BOOKING_TEST_TOKEN || '');
  const cfg = BRANDS[brand];
  const link = test ? cfg.testLink : cfg.link;

  // At most a couple of open holds per visitor, so one client cannot block the calendar.
  const ip = origin(request).ip || 'unknown';
  const ipKey = `booking:ip:${ip}`;
  const ipHolds = Number((await kv.get(ipKey)) || 0);
  if (ipHolds >= MAX_HOLDS_PER_IP && !test) return json({ ok: false, error: 'too_many_holds' }, 429, headers);

  if (await kv.get(slotKey(startIso))) return json({ ok: false, error: 'slot_taken' }, 409, headers);
  let cal;
  try {
    const day0 = new Date(slot.start.getTime() - 12 * 3600000).toISOString();
    const day1 = new Date(slot.start.getTime() + 12 * 3600000).toISOString();
    cal = await callAppsScript(env, { action: 'freebusy', timeMin: day0, timeMax: day1 });
  } catch (err) {
    console.error('booking_hold_calendar_failed', err?.message || err);
    return json({ ok: false, error: 'calendar_unavailable' }, 503, headers);
  }
  const holds = await activeHolds(kv);
  const free = availableSlots(now, { busy: cal.busy, booked: cal.booked, holds });
  if (!free.some((s) => s.start.getTime() === slot.start.getTime())) {
    return json({ ok: false, error: 'slot_taken' }, 409, headers);
  }

  const holdId = crypto.randomUUID();
  const expiresAt = new Date(now.getTime() + HOLD_MIN * 60000).toISOString();
  const record = {
    id: holdId, brand, start: startIso, end: slot.end.toISOString(), name, email, agenda,
    test, linkId: link.id, amount: test ? link.amount : cfg.amount,
    status: 'held', createdAt: now.toISOString(), expiresAt,
  };
  await kv.put(holdKey(holdId), JSON.stringify(record), { expirationTtl: HOLD_RECORD_TTL_S });
  await kv.put(slotKey(startIso), holdId, { expirationTtl: HOLD_MIN * 60 });
  await kv.put(ipKey, String(ipHolds + 1), { expirationTtl: HOLD_MIN * 60 });

  const url = `${link.url}?client_reference_id=${holdId}&prefilled_email=${encodeURIComponent(email)}`;
  return json({ ok: true, holdId, expiresAt, url }, 200, headers);
}

export async function onRequestOptions({ request }) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}
