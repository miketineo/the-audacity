import {
  availableSlots, activeHolds, callAppsScript, corsHeaders, json, parseBrand, HORIZON_DAYS,
} from '../../_lib/booking.js';

// GET /api/booking/slots?brand=audacity|miketineo
// Open slots for the next HORIZON_DAYS, as ISO instants (the client renders them
// in the visitor's time zone).
export async function onRequestGet(context) {
  const { request, env } = context;
  const headers = corsHeaders(request);
  const brand = parseBrand(new URL(request.url).searchParams.get('brand'));
  if (!brand) return json({ ok: false, error: 'invalid_brand' }, 400, headers);

  const now = new Date();
  const timeMin = new Date(now.getTime() + 3600000).toISOString();
  const timeMax = new Date(now.getTime() + (HORIZON_DAYS + 2) * 86400000).toISOString();
  let cal;
  try {
    cal = await callAppsScript(env, { action: 'freebusy', timeMin, timeMax });
  } catch (err) {
    console.error('booking_slots_calendar_failed', err?.message || err);
    return json({ ok: false, error: 'calendar_unavailable' }, 503, headers);
  }
  const holds = await activeHolds(env.WAITLIST);
  const slots = availableSlots(now, { busy: cal.busy, booked: cal.booked, holds });
  return json(
    { ok: true, tz: 'Europe/Rome', minutes: 45, slots: slots.map((s) => ({ start: s.start.toISOString(), end: s.end.toISOString() })) },
    200,
    headers
  );
}

export async function onRequestOptions({ request }) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}
