import {
  callAppsScript, esc, fmtRome, holdKey, parseBrand, slotKey, verifyStripeSignature, HOLD_RECORD_TTL_S,
} from '../../../_lib/booking.js';
import { notifySlack } from '../../../_lib/slack.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ok = (note) => new Response(JSON.stringify({ received: true, note }), { status: 200, headers: { 'Content-Type': 'application/json' } });

// POST /api/booking/webhook/<brand>: Stripe checkout.session.completed.
// Only paid sessions whose client_reference_id is a hold made by /api/booking/hold
// are handled; every other session on these accounts is acknowledged and ignored.
export async function onRequestPost(context) {
  const { request, env, params } = context;
  const brand = parseBrand(params.brand);
  if (!brand) return new Response('not found', { status: 404 });

  const raw = await request.text();
  const secret = env[`STRIPE_WEBHOOK_SECRET_${brand.toUpperCase()}`];
  if (!(await verifyStripeSignature(raw, request.headers.get('stripe-signature'), secret))) {
    return new Response('bad signature', { status: 400 });
  }
  const event = JSON.parse(raw);
  if (event.type !== 'checkout.session.completed') return ok('ignored_type');
  const session = event.data?.object || {};
  if (session.payment_status !== 'paid') return ok('not_paid');
  const ref = session.client_reference_id;
  if (!ref || !UUID_RE.test(ref)) return ok('not_a_booking');

  const ping = (text) =>
    context.waitUntil(
      notifySlack({ webhookUrl: env.SLACK_WEBHOOK_URL, text }).catch((e) => console.error('booking_slack_failed', e?.message || e))
    );
  const who = `${esc(session.customer_details?.email || '?')}, ${(session.amount_total ?? 0) / 100} ${String(session.currency || '').toUpperCase()}, session ${esc(session.id)}`;

  const kv = env.WAITLIST;
  const raw_hold = await kv.get(holdKey(ref));
  if (!raw_hold) {
    // KV can lag a minute across locations: ask Stripe to retry a fresh event.
    if (Date.now() / 1000 - (event.created || 0) < 300) return new Response('hold not visible yet', { status: 503 });
    ping(`:warning: *Paid diagnostic call, hold not found* (${brand})\n${who}\nRefund or reschedule by hand.`);
    return ok('hold_missing');
  }
  const hold = JSON.parse(raw_hold);
  if (hold.status === 'booked') return ok('already_booked');

  if (hold.brand !== brand || session.payment_link !== hold.linkId || session.amount_total !== hold.amount) {
    ping(`:warning: *Paid diagnostic call does not match its hold* (${brand})\n${who}\nHold ${esc(ref)} expects ${esc(hold.brand)} ${hold.amount / 100} EUR on ${esc(hold.linkId)}. Check and refund by hand.`);
    return ok('mismatch');
  }

  const lock = await kv.get(slotKey(hold.start));
  const save = (patch) => kv.put(holdKey(ref), JSON.stringify({ ...hold, ...patch }), { expirationTtl: HOLD_RECORD_TTL_S });
  const label = `${fmtRome(hold.start)}, ${esc(hold.name)} <${esc(hold.email)}>${hold.test ? ' [EUR 1 TEST]' : ''}`;
  if (lock && lock !== ref) {
    await save({ status: 'conflict', sessionId: session.id });
    ping(`:warning: *Paid diagnostic call, slot taken by another hold* (${brand})\n${label}\n${who}\nRefund or reschedule by hand.`);
    return ok('slot_taken');
  }

  try {
    const res = await callAppsScript(env, {
      action: 'create', brand, start: hold.start, end: hold.end, name: hold.name, email: hold.email,
      agenda: hold.agenda, sessionId: session.id,
    });
    await save({ status: 'booked', sessionId: session.id, eventId: res.eventId, bookedAt: new Date().toISOString() });
    ping(`:calendar: *Diagnostic call booked* (${brand})\n${label}\n${who}\nAgenda (untrusted input): ${esc(hold.agenda.slice(0, 500))}`);
    return ok('booked');
  } catch (err) {
    const msg = err?.message || String(err);
    if (msg === 'apps_script_slot_taken') {
      await save({ status: 'conflict', sessionId: session.id });
      ping(`:warning: *Paid diagnostic call, slot no longer free on the calendar* (${brand})\n${label}\n${who}\nRefund or reschedule by hand.`);
      return ok('slot_taken');
    }
    console.error('booking_create_failed', msg);
    ping(`:warning: *Diagnostic call paid, calendar event failed* (${brand}): ${esc(msg)}\n${label}\n${who}\nStripe retries the webhook; check if it persists.`);
    return new Response('calendar failed', { status: 500 });
  }
}
