// Paid diagnostic call booking. Run: node --test tests/*.test.mjs  (Node >= 22)
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  BRANDS, candidateSlots, availableSlots, verifyStripeSignature, _hmacHexForTests, zoned, holdKey, slotKey,
} from '../functions/_lib/booking.js';
import { onRequestGet as slotsGet } from '../functions/api/booking/slots.js';
import { onRequestPost as holdPost } from '../functions/api/booking/hold.js';
import { onRequestPost as webhookPost } from '../functions/api/booking/webhook/[brand].js';

// Monday 23 Nov 2026, 11:00 in Rome.
const NOW = new Date('2026-11-23T10:00:00Z');

class MemKV {
  constructor() { this.m = new Map(); }
  async get(k) { return this.m.has(k) ? this.m.get(k) : null; }
  async put(k, v) { this.m.set(k, v); }
  async delete(k) { this.m.delete(k); }
  async list({ prefix }) { return { keys: [...this.m.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true }; }
}

let calls;
let calendar; // { busy, booked, createResult }
const realFetch = globalThis.fetch;
beforeEach(() => {
  calls = [];
  calendar = { busy: [], booked: [], createResult: { ok: true, eventId: 'evt1' } };
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url, body });
    if (url.startsWith('https://hooks.slack')) return new Response('ok');
    if (body.secret !== 'as-secret') return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }));
    if (body.action === 'freebusy') return new Response(JSON.stringify({ ok: true, busy: calendar.busy, booked: calendar.booked }));
    if (body.action === 'create') return new Response(JSON.stringify(calendar.createResult));
    return realFetch(url, init);
  };
});

function env(kv = new MemKV()) {
  return {
    WAITLIST: kv, APPS_SCRIPT_URL: 'https://script.google.com/macros/s/x/exec', APPS_SCRIPT_SECRET: 'as-secret',
    STRIPE_WEBHOOK_SECRET_AUDACITY: 'whsec_a', STRIPE_WEBHOOK_SECRET_MIKETINEO: 'whsec_m',
    BOOKING_TEST_TOKEN: 'test-token', SLACK_WEBHOOK_URL: 'https://hooks.slack.test/x',
  };
}

function ctx(request, e, params = {}) {
  const pending = [];
  return { request, env: e, params, waitUntil: (p) => pending.push(p), pending };
}

const post = (url, body, origin = 'https://theaudacity.io') =>
  new Request(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, 'cf-connecting-ip': `203.0.113.${Math.floor(Math.random() * 250)}` }, body: JSON.stringify(body) });

// ---- slot rules ----

test('slots: weekdays only, 09:00 to 16:00 Rome starts, from tomorrow, 21 days ahead', () => {
  const s = candidateSlots(NOW);
  assert.equal(s[0].start.toISOString(), '2026-11-24T08:00:00.000Z'); // Tue 09:00 Rome
  assert.equal(s[7].start.toISOString(), '2026-11-24T15:00:00.000Z'); // Tue 16:00 Rome, ends 16:45
  assert.equal(s[8].start.toISOString(), '2026-11-25T08:00:00.000Z');
  for (const { start } of s) assert.ok(![0, 6].includes(new Date(start.getTime() + 3600000).getUTCDay()));
  assert.equal(s.length, 15 * 8); // 24 Nov to 14 Dec: 15 weekdays
  assert.ok(s.at(-1).start < new Date('2026-12-15T00:00:00Z'));
});

test('slots: follow Rome time across the DST change', () => {
  const s = candidateSlots(new Date('2026-03-25T10:00:00Z'));
  const mon = s.find((x) => x.start.toISOString().startsWith('2026-03-30'));
  assert.equal(mon.start.toISOString(), '2026-03-30T07:00:00.000Z'); // CEST, UTC+2
  assert.equal(zoned(2026, 3, 27, 9).toISOString(), '2026-03-27T08:00:00.000Z'); // CET, UTC+1
});

test('slots: busy time blocks the slot plus the 15-minute buffer', () => {
  // Busy Tue 10:50 to 11:00 Rome: blocks 10:00 (ends 10:45, buffer to 11:00) and 11:00 (buffer from 10:45).
  const busy = [{ start: '2026-11-24T09:50:00Z', end: '2026-11-24T10:00:00Z' }];
  const tue = availableSlots(NOW, { busy }).filter((x) => x.start.toISOString().startsWith('2026-11-24'));
  assert.deepEqual(tue.map((x) => x.start.toISOString().slice(11, 16)), ['08:00', '11:00', '12:00', '13:00', '14:00', '15:00']);
});

test('slots: at most 3 diagnostic calls a day, holds count and are removed', () => {
  const booked = [{ start: '2026-11-24T08:00:00Z' }, { start: '2026-11-24T12:00:00Z' }];
  const holds = [{ start: '2026-11-25T08:00:00.000Z' }];
  const free = availableSlots(NOW, { booked, holds });
  // Booked calls block their own time through busy; the booked list only feeds the cap.
  assert.equal(free.filter((x) => x.start.toISOString().startsWith('2026-11-24')).length, 8);
  assert.ok(!free.some((x) => x.start.toISOString() === '2026-11-25T08:00:00.000Z'));
  const full = availableSlots(NOW, { booked, holds: [{ start: '2026-11-24T14:00:00.000Z' }] });
  assert.equal(full.filter((x) => x.start.toISOString().startsWith('2026-11-24')).length, 0);
});

// ---- Stripe signature ----

async function signed(payload, secret, t = Math.floor(Date.now() / 1000)) {
  const raw = JSON.stringify(payload);
  return { raw, header: `t=${t},v1=${await _hmacHexForTests(secret, `${t}.${raw}`)}` };
}

test('stripe signature: valid passes, tampered, stale or wrong secret fail', async () => {
  const { raw, header } = await signed({ a: 1 }, 'whsec_a');
  assert.equal(await verifyStripeSignature(raw, header, 'whsec_a'), true);
  assert.equal(await verifyStripeSignature(raw + ' ', header, 'whsec_a'), false);
  assert.equal(await verifyStripeSignature(raw, header, 'whsec_m'), false);
  const old = await signed({ a: 1 }, 'whsec_a', Math.floor(Date.now() / 1000) - 3600);
  assert.equal(await verifyStripeSignature(old.raw, old.header, 'whsec_a'), false);
  assert.equal(await verifyStripeSignature(raw, undefined, 'whsec_a'), false);
});

// ---- endpoints ----

function tomorrowSlot() {
  // A real candidate relative to the real clock (the endpoints use Date.now()).
  return candidateSlots(new Date())[0].start.toISOString();
}

test('GET slots: CORS pinned to the two sites, brand required', async () => {
  const e = env();
  const r = await slotsGet(ctx(new Request('https://theaudacity.io/api/booking/slots?brand=miketineo', { headers: { Origin: 'https://miketineo.com' } }), e));
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), 'https://miketineo.com');
  assert.ok((await r.json()).slots.length > 0);
  const evil = await slotsGet(ctx(new Request('https://theaudacity.io/api/booking/slots?brand=audacity', { headers: { Origin: 'https://evil.example' } }), e));
  assert.equal(evil.headers.get('Access-Control-Allow-Origin'), null);
  const bad = await slotsGet(ctx(new Request('https://theaudacity.io/api/booking/slots?brand=x'), e));
  assert.equal(bad.status, 400);
});

const holdBody = (over = {}) => ({ brand: 'audacity', start: tomorrowSlot(), name: 'Ada', email: 'Ada@Example.com', agenda: 'A booking app', ...over });

test('POST hold: reserves the slot and returns the brand Payment Link', async () => {
  const e = env();
  const r = await holdPost(ctx(post('https://theaudacity.io/api/booking/hold', holdBody()), e));
  assert.equal(r.status, 200);
  const d = await r.json();
  assert.ok(d.url.startsWith(BRANDS.audacity.link.url + '?client_reference_id=' + d.holdId));
  assert.ok(d.url.endsWith('&prefilled_email=ada%40example.com'));
  const rec = JSON.parse(await e.WAITLIST.get(holdKey(d.holdId)));
  assert.equal(rec.status, 'held');
  assert.equal(rec.amount, 17500);
  assert.equal(await e.WAITLIST.get(slotKey(rec.start)), d.holdId);
  // Same slot again: taken.
  const again = await holdPost(ctx(post('https://theaudacity.io/api/booking/hold', holdBody()), e));
  assert.equal(again.status, 409);
});

test('POST hold: miketineo gets its own link, the test token only works for The Audacity', async () => {
  const e = env();
  const m = await (await holdPost(ctx(post('https://theaudacity.io/api/booking/hold', holdBody({ brand: 'miketineo', test: 'test-token' }), 'https://miketineo.com'), e))).json();
  assert.ok(m.url.startsWith(BRANDS.miketineo.link.url + '?'));
  const slot2 = candidateSlots(new Date())[1].start.toISOString();
  const t = await (await holdPost(ctx(post('https://theaudacity.io/api/booking/hold', holdBody({ start: slot2, test: 'test-token' })), e))).json();
  assert.ok(t.url.startsWith(BRANDS.audacity.testLink.url + '?'));
  const slot3 = candidateSlots(new Date())[2].start.toISOString();
  const w = await (await holdPost(ctx(post('https://theaudacity.io/api/booking/hold', holdBody({ start: slot3, test: 'wrong' })), e))).json();
  assert.ok(w.url.startsWith(BRANDS.audacity.link.url + '?'));
});

test('POST hold: rejects bad input, off-grid slots and busy slots', async () => {
  const e = env();
  const h = (b) => holdPost(ctx(post('https://theaudacity.io/api/booking/hold', b), e));
  assert.equal((await h(holdBody({ email: 'nope' }))).status, 400);
  assert.equal((await h(holdBody({ agenda: '' }))).status, 400);
  assert.equal((await h(holdBody({ start: '2026-11-24T08:30:00Z' }))).status, 400);
  assert.equal((await h(holdBody({ brand: 'other' }))).status, 400);
  const s = tomorrowSlot();
  calendar.busy = [{ start: s, end: new Date(new Date(s).getTime() + 600000).toISOString() }];
  assert.equal((await h(holdBody({ start: s }))).status, 409);
});

async function makeHold(e, over = {}) {
  const d = await (await holdPost(ctx(post('https://theaudacity.io/api/booking/hold', holdBody(over)), e))).json();
  return JSON.parse(await e.WAITLIST.get(holdKey(d.holdId)));
}

function sessionEvent(hold, over = {}) {
  return {
    id: 'evt_1', type: 'checkout.session.completed', created: Math.floor(Date.now() / 1000),
    data: { object: {
      id: 'cs_live_1', payment_status: 'paid', client_reference_id: hold?.id, payment_link: hold?.linkId,
      amount_total: hold?.amount, currency: 'eur', customer_details: { email: 'ada@example.com' }, ...over,
    } },
  };
}

async function deliver(e, brand, event, secret = `whsec_${brand[0]}`) {
  const { raw, header } = await signed(event, secret);
  const c = ctx(new Request(`https://theaudacity.io/api/booking/webhook/${brand}`, { method: 'POST', headers: { 'stripe-signature': header }, body: raw }), e, { brand });
  const r = await webhookPost(c);
  await Promise.all(c.pending);
  return r;
}

test('webhook: paid session for a known hold creates the event once', async () => {
  const e = env();
  const hold = await makeHold(e);
  calls = [];
  const r = await deliver(e, 'audacity', sessionEvent(hold));
  assert.equal(r.status, 200);
  const create = calls.find((c) => c.body.action === 'create');
  assert.deepEqual(
    { brand: create.body.brand, start: create.body.start, email: create.body.email, sessionId: create.body.sessionId },
    { brand: 'audacity', start: hold.start, email: 'ada@example.com', sessionId: 'cs_live_1' }
  );
  assert.equal(JSON.parse(await e.WAITLIST.get(holdKey(hold.id))).status, 'booked');
  assert.ok(calls.some((c) => c.url.startsWith('https://hooks.slack') && c.body.text.includes('booked')));
  calls = [];
  await deliver(e, 'audacity', sessionEvent(hold)); // Stripe retry
  assert.equal(calls.filter((c) => c.body.action === 'create').length, 0);
});

test('webhook: bad signature is refused, other sessions and events are ignored', async () => {
  const e = env();
  const hold = await makeHold(e);
  calls = [];
  assert.equal((await deliver(e, 'audacity', sessionEvent(hold), 'whsec_m')).status, 400); // other brand's secret
  assert.equal((await deliver(e, 'audacity', sessionEvent(hold, { payment_status: 'unpaid' }))).status, 200);
  assert.equal((await deliver(e, 'audacity', sessionEvent(hold, { client_reference_id: null }))).status, 200);
  assert.equal((await deliver(e, 'audacity', { ...sessionEvent(hold), type: 'checkout.session.expired' })).status, 200);
  assert.equal(calls.length, 0); // abandoned or foreign checkouts create nothing and ping nobody
  assert.equal(JSON.parse(await e.WAITLIST.get(holdKey(hold.id))).status, 'held');
});

test('webhook: wrong link or amount pings Slack and books nothing', async () => {
  const e = env();
  const hold = await makeHold(e);
  calls = [];
  await deliver(e, 'audacity', sessionEvent(hold, { payment_link: BRANDS.audacity.testLink.id, amount_total: 100 }));
  assert.equal(calls.filter((c) => c.body.action === 'create').length, 0);
  assert.ok(calls.some((c) => c.body.text?.includes('does not match')));
});

test('webhook: hold gone or slot taken pings Slack for a refund', async () => {
  const e = env();
  const hold = await makeHold(e);
  calls = [];
  const old = { ...sessionEvent({ ...hold, id: crypto.randomUUID() }), created: Math.floor(Date.now() / 1000) - 3600 };
  assert.equal((await deliver(e, 'audacity', old)).status, 200);
  assert.ok(calls.some((c) => c.body.text?.includes('hold not found')));
  calls = [];
  calendar.createResult = { ok: false, error: 'slot_taken' };
  await deliver(e, 'audacity', sessionEvent(hold));
  assert.ok(calls.some((c) => c.body.text?.includes('no longer free')));
  assert.equal(JSON.parse(await e.WAITLIST.get(holdKey(hold.id))).status, 'conflict');
});

test('webhook: a fresh event whose hold is not visible yet asks Stripe to retry', async () => {
  const e = env();
  const hold = await makeHold(e);
  const r = await deliver(e, 'audacity', sessionEvent({ ...hold, id: crypto.randomUUID() }));
  assert.equal(r.status, 503);
});
