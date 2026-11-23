// Minimal Amazon SES (API v2, SendEmail) client for Cloudflare Pages Functions.
// No dependencies: the request is signed with AWS Signature Version 4 over
// WebCrypto. Throws on real failures so callers using ctx.waitUntil() can log
// them. Returns null (not throwing) only when the keys are absent, so the
// endpoints keep working in local dev without secrets.
//
// The IAM user behind the keys may only ses:SendEmail from
// obviously@theaudacity.io (docs/ops/live-config.md).

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const sha256 = async (s) => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));

async function hmac(key, msg) {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
}

// The SigV4 signing key for one day, region and service.
export async function signingKey(secret, day, region, service) {
  let k = await hmac(enc.encode(`AWS4${secret}`), day);
  for (const part of [region, service, 'aws4_request']) k = await hmac(k, part);
  return k;
}

// Headers for a signed JSON POST. `now` is injectable for tests.
export async function signedHeaders({ accessKeyId, secretAccessKey, region }, host, path, body, now = new Date()) {
  const amzDate = now.toISOString().replace(/[-:]|\.\d{3}/g, ''); // 20261123T160000Z
  const day = amzDate.slice(0, 8);
  const scope = `${day}/${region}/ses/aws4_request`;
  const signed = 'content-type;host;x-amz-date';
  const canonical = [
    'POST', path, '',
    'content-type:application/json', `host:${host}`, `x-amz-date:${amzDate}`, '',
    signed, await sha256(body),
  ].join('\n');
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, await sha256(canonical)].join('\n');
  const signature = hex(await hmac(await signingKey(secretAccessKey, day, region, 'ses'), toSign));
  return {
    'Content-Type': 'application/json',
    'X-Amz-Date': amzDate,
    Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signed}, Signature=${signature}`,
  };
}

// The three Pages secrets, or null when any is missing.
export function sesKeys(env) {
  const { SES_ACCESS_KEY_ID: accessKeyId, SES_SECRET_ACCESS_KEY: secretAccessKey, SES_REGION: region } = env || {};
  return accessKeyId && secretAccessKey && region ? { accessKeyId, secretAccessKey, region } : null;
}

export async function sendEmail({ keys, from, to, subject, html, text, replyTo }) {
  if (!keys) {
    console.warn('sendEmail skipped: SES keys are not set');
    return null;
  }
  const part = (Data) => ({ Data, Charset: 'UTF-8' });
  const body = JSON.stringify({
    FromEmailAddress: from,
    Destination: { ToAddresses: Array.isArray(to) ? to : [to] },
    ReplyToAddresses: replyTo ? [replyTo] : undefined,
    Content: {
      Simple: {
        Subject: part(subject),
        Body: { Html: html ? part(html) : undefined, Text: text ? part(text) : undefined },
      },
    },
  });
  const host = `email.${keys.region}.amazonaws.com`;
  const path = '/v2/email/outbound-emails';
  const response = await fetch(`https://${host}${path}`, {
    method: 'POST',
    headers: await signedHeaders(keys, host, path, body),
    body,
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`ses_http_${response.status}: ${errText.slice(0, 300)}`);
  }
  return await response.json(); // { MessageId }
}
