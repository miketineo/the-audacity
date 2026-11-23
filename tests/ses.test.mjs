// SES client (functions/_lib/ses.js). Run: node --test tests/*.test.mjs  (Node >= 22)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signingKey, signedHeaders, sesKeys, sendEmail } from '../functions/_lib/ses.js';

const hex = (u8) => [...u8].map((b) => b.toString(16).padStart(2, '0')).join('');
const KEYS = { accessKeyId: 'AKIDEXAMPLE', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY', region: 'eu-west-1' };

test('signing key matches the AWS documentation example', async () => {
  // docs.aws.amazon.com "Examples of how to derive a signing key for Signature Version 4".
  const k = await signingKey('wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY', '20120215', 'us-east-1', 'iam');
  assert.equal(hex(k), 'f4780e2d9f65fa895f9c67b32ce1baf0b0d8a43505a000a1a9e090d414db404d');
});

test('signed headers are deterministic and bound to body, host and date', async () => {
  const now = new Date('2026-11-23T16:00:00.000Z');
  const sign = (body, host = 'email.eu-west-1.amazonaws.com', at = now) => signedHeaders(KEYS, host, '/v2/email/outbound-emails', body, at);
  const a = await sign('{"a":1}');
  assert.equal(a['X-Amz-Date'], '20261123T160000Z');
  assert.match(a.Authorization, /^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE\/20261123\/eu-west-1\/ses\/aws4_request, SignedHeaders=content-type;host;x-amz-date, Signature=[0-9a-f]{64}$/);
  assert.deepEqual(await sign('{"a":1}'), a);
  const sig = (h) => h.Authorization.split('Signature=')[1];
  assert.notEqual(sig(await sign('{"a":2}')), sig(a));
  assert.notEqual(sig(await sign('{"a":1}', 'email.us-east-1.amazonaws.com')), sig(a));
  assert.notEqual(sig(await sign('{"a":1}', undefined, new Date('2026-11-23T16:00:01.000Z'))), sig(a));
});

test('sesKeys needs all three secrets', () => {
  assert.equal(sesKeys({}), null);
  assert.equal(sesKeys({ SES_ACCESS_KEY_ID: 'a', SES_SECRET_ACCESS_KEY: 'b' }), null);
  assert.deepEqual(sesKeys({ SES_ACCESS_KEY_ID: 'a', SES_SECRET_ACCESS_KEY: 'b', SES_REGION: 'eu-west-1' }),
    { accessKeyId: 'a', secretAccessKey: 'b', region: 'eu-west-1' });
});

test('sendEmail: no keys is a no-op, a refusal throws with the status', async () => {
  const orig = globalThis.fetch; const warn = console.warn; console.warn = () => {};
  try {
    globalThis.fetch = async () => { throw new Error('no network expected'); };
    assert.equal(await sendEmail({ keys: null, from: 'a@x', to: 'b@x', subject: 's', text: 't' }), null);
    globalThis.fetch = async () => new Response('{"message":"Email address is not verified."}', { status: 400 });
    await assert.rejects(sendEmail({ keys: KEYS, from: 'a@x', to: 'b@x', subject: 's', text: 't' }), /^Error: ses_http_400: /);
  } finally { globalThis.fetch = orig; console.warn = warn; }
});
