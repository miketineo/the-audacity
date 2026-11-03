// API host guard. Run: node --test tests/*.test.mjs  (Node >= 22)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/api/_middleware.js';

function ctx(url) {
  return { request: new Request(url, { method: 'POST' }), next: async () => new Response('passed') };
}

test('bare pages.dev host is refused', async () => {
  const r = await onRequest(ctx('https://the-audacity.pages.dev/api/inquiry'));
  assert.equal(r.status, 403);
});

test('real domain and preview aliases pass through', async () => {
  for (const u of [
    'https://theaudacity.io/api/inquiry',
    'https://www.theaudacity.io/api/waitlist',
    'https://preview-kerf-work.the-audacity.pages.dev/api/inquiry',
  ]) {
    assert.equal(await (await onRequest(ctx(u))).text(), 'passed', u);
  }
});
