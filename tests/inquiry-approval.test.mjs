// SEC-11 inquiry approval gate. Run: node --test tests/*.test.mjs  (Node >= 22)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mintToken, verifyToken, TTL_MS, DECISION_PREFIX } from '../functions/_lib/approval.js';
import * as decision from '../functions/api/inquiry-decision.js';
import * as inquiry from '../functions/api/inquiry.js';

const SECRET = 'test-secret-0123456789abcdef';
const KEY = 'inquiry:2026-09-27T10:00:00.000Z:victim@example.com';
const RECORD = { name: 'Evil <a href=x>Name</a>', email: 'victim@example.com', message: 'click http://phish' };

function kv(seed = {}) {
  const m = new Map(Object.entries(seed));
  return { m, get: async (k) => m.get(k) ?? null, put: async (k, v) => { m.set(k, v); } };
}

function withFetch(fn) {
  const calls = [];
  const orig = globalThis.fetch;
  globalThis.fetch = async (url, init) => { calls.push({ url: String(url), init }); return fn(String(url), init); };
  return { calls, restore: () => { globalThis.fetch = orig; } };
}

function post(token, action) {
  const body = new URLSearchParams({ t: token, action });
  return new Request('https://x.pages.dev/api/inquiry-decision', { method: 'POST', body });
}

test('token round trip, tamper, wrong secret, expiry, unconfigured', async () => {
  const t = await mintToken(SECRET, KEY);
  assert.deepEqual(await verifyToken(SECRET, t), { ok: true, key: KEY });
  const [p, s] = t.split('.');
  const flipped = p.slice(0, -2) + (p.at(-2) === 'A' ? 'B' : 'A') + p.at(-1);
  assert.equal((await verifyToken(SECRET, `${flipped}.${s}`)).reason, 'bad_signature');
  const forged = Buffer.from(JSON.stringify({ k: 'inquiry:other', e: Date.now() + 1e9 })).toString('base64url');
  assert.equal((await verifyToken(SECRET, `${forged}.${s}`)).reason, 'bad_signature');
  assert.equal((await verifyToken('other-secret', t)).reason, 'bad_signature');
  assert.equal((await verifyToken(SECRET, 'garbage')).reason, 'malformed');
  assert.equal((await verifyToken(undefined, t)).reason, 'not_configured');
  const old = await mintToken(SECRET, KEY, Date.now() - TTL_MS - 1000);
  assert.equal((await verifyToken(SECRET, old)).reason, 'expired');
  assert.equal((await verifyToken(SECRET, await mintToken(SECRET, 'email:x@y.z'))).reason, 'malformed');
});

test('GET shows the confirm page and never decides', async () => {
  const env = { INQUIRY_APPROVAL_SECRET: SECRET, WAITLIST: kv({ [KEY]: JSON.stringify(RECORD) }) };
  const t = await mintToken(SECRET, KEY);
  const res = await decision.onRequestGet({ request: new Request(`https://x/api/inquiry-decision?t=${t}`), env });
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.ok(!html.includes('victim') && !html.includes('Evil') && !html.includes('phish'));
  assert.equal(env.WAITLIST.m.has(DECISION_PREFIX + KEY), false);
});

test('approve with RESEND_API_KEY unset: logged no-op, recorded, then refused on replay', async () => {
  const env = { INQUIRY_APPROVAL_SECRET: SECRET, WAITLIST: kv({ [KEY]: JSON.stringify(RECORD) }) };
  const f = withFetch(() => { throw new Error('no network expected'); });
  const warn = console.warn; const warned = []; console.warn = (...a) => warned.push(a.join(' '));
  try {
    const t = await mintToken(SECRET, KEY);
    const res = await decision.onRequestPost({ request: post(t, 'approve'), env });
    assert.equal(res.status, 200);
    assert.match(await res.text(), /switched off/);
    assert.equal(f.calls.length, 0);
    assert.ok(warned.some((w) => w.includes('RESEND_API_KEY is not set')));
    assert.equal(JSON.parse(env.WAITLIST.m.get(DECISION_PREFIX + KEY)).action, 'approve');
    for (const a of ['approve', 'reject']) {
      const again = await decision.onRequestPost({ request: post(t, a), env });
      assert.equal(again.status, 409);
    }
    const g = await decision.onRequestGet({ request: new Request(`https://x/api/inquiry-decision?t=${t}`), env });
    assert.equal(g.status, 409);
  } finally { f.restore(); console.warn = warn; }
});

test('approve with a key sends the FIXED template, no submitter text', async () => {
  const env = { INQUIRY_APPROVAL_SECRET: SECRET, RESEND_API_KEY: 're_test', WAITLIST: kv({ [KEY]: JSON.stringify(RECORD) }) };
  const f = withFetch(() => new Response('{"id":"1"}', { status: 200 }));
  try {
    const res = await decision.onRequestPost({ request: post(await mintToken(SECRET, KEY), 'approve'), env });
    assert.equal(res.status, 200);
    assert.equal(f.calls.length, 1);
    assert.equal(f.calls[0].url, 'https://api.resend.com/emails');
    const sent = JSON.parse(f.calls[0].init.body);
    assert.deepEqual(sent.to, ['victim@example.com']);
    assert.equal(sent.reply_to, 'obviously@theaudacity.io');
    const all = sent.subject + sent.html + sent.text;
    for (const bad of ['Evil', 'href=x', 'phish', 'victim']) assert.ok(!all.includes(bad), bad);
    assert.match(sent.text, /^Hey there,/);
  } finally { f.restore(); }
});

test('reject records the decision and sends nothing; bad inputs refused', async () => {
  const env = { INQUIRY_APPROVAL_SECRET: SECRET, RESEND_API_KEY: 're_test', WAITLIST: kv({ [KEY]: JSON.stringify(RECORD) }) };
  const f = withFetch(() => { throw new Error('no network expected'); });
  try {
    const t = await mintToken(SECRET, KEY);
    assert.equal((await decision.onRequestPost({ request: post(t, 'delete'), env })).status, 400);
    assert.equal((await decision.onRequestPost({ request: post(t + 'x', 'approve'), env })).status, 403);
    const res = await decision.onRequestPost({ request: post(t, 'reject'), env });
    assert.equal(res.status, 200);
    assert.equal(JSON.parse(env.WAITLIST.m.get(DECISION_PREFIX + KEY)).action, 'reject');
    assert.equal(f.calls.length, 0);
    const other = await mintToken(SECRET, 'inquiry:missing');
    assert.equal((await decision.onRequestPost({ request: post(other, 'approve'), env })).status, 404);
  } finally { f.restore(); }
});

test('accepted inquiry: Slack ping carries a working approval link; no email to submitter', async () => {
  const env = { TURNSTILE_SECRET: 'ts', SLACK_WEBHOOK_URL: 'https://hooks.slack.test/x', INQUIRY_APPROVAL_SECRET: SECRET, WAITLIST: kv() };
  const f = withFetch((url) => url.includes('turnstile')
    ? new Response('{"success":true}')
    : new Response('ok'));
  const pending = [];
  try {
    const request = new Request('https://preview.the-audacity.pages.dev/api/inquiry', {
      method: 'POST',
      body: JSON.stringify({ name: 'A <!channel>', email: 'a@example.com', message: 'hi', turnstile: 'tok' }),
    });
    const res = await inquiry.onRequestPost({ request, env, waitUntil: (p) => pending.push(p) });
    assert.equal(res.status, 200);
    await Promise.all(pending);
    const slack = f.calls.find((c) => c.url.includes('hooks.slack.test'));
    const text = JSON.parse(slack.init.body).text;
    assert.ok(!text.includes('<!channel>'));
    const m = text.match(/<(https:\/\/preview\.the-audacity\.pages\.dev\/api\/inquiry-decision\?t=([A-Za-z0-9_.-]+))\|/);
    assert.ok(m, 'approval link present');
    const [key] = [...env.WAITLIST.m.keys()].filter((k) => k.startsWith('inquiry:'));
    assert.deepEqual(await verifyToken(SECRET, m[2]), { ok: true, key });
    assert.ok(!f.calls.some((c) => c.url.includes('resend') && JSON.parse(c.init.body).to.includes('a@example.com')));
  } finally { f.restore(); }
});
