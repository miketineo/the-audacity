import { sendEmail } from '../_lib/resend.js';
import { inquirySubject, inquiryHtml, inquiryText } from '../_lib/emails/inquiry.js';

const CORS_ORIGIN = 'https://theaudacity.io';

// Field length caps. Generous enough for a real brief, tight enough to keep a
// single KV value and email body sane.
const CAPS = {
  name: 120,
  email: 200,
  company: 160,
  project_idea: 2000,
  budget: 80,
  timeline: 80,
  message: 4000,
};

function clean(value, cap) {
  return (typeof value === 'string' ? value : '').trim().slice(0, cap);
}

// Sanitize the utm bag: only string keys/values, each capped, max 12 keys.
function cleanUtm(utm) {
  if (!utm || typeof utm !== 'object') return {};
  const out = {};
  let count = 0;
  for (const [k, v] of Object.entries(utm)) {
    if (count >= 12) break;
    if (typeof k !== 'string') continue;
    const key = k.trim().slice(0, 60);
    if (!key) continue;
    out[key] = clean(v, 200);
    count += 1;
  }
  return out;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    'Content-Type': 'application/json',
  };

  let data;
  try {
    const body = await request.json();
    data = {
      name: clean(body.name, CAPS.name),
      email: clean(body.email, CAPS.email).toLowerCase(),
      company: clean(body.company, CAPS.company),
      project_idea: clean(body.project_idea, CAPS.project_idea),
      budget: clean(body.budget, CAPS.budget),
      timeline: clean(body.timeline, CAPS.timeline),
      message: clean(body.message, CAPS.message),
      utm: cleanUtm(body.utm),
    };
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'invalid_body' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return new Response(JSON.stringify({ ok: false, error: 'invalid_email' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const timestamp = new Date().toISOString();
  const record = { ...data, timestamp };

  // Same binding as the waitlist endpoint; namespaced with an 'inquiry:' key
  // prefix so submissions never collide with waitlist 'email:' entries. Keyed
  // by timestamp+email so repeat inquiries from one sender are all retained.
  const key = `inquiry:${timestamp}:${data.email}`;
  await env.WAITLIST.put(key, JSON.stringify(record));

  // Fire-and-forget email. The inquiry is already persisted, so a Resend
  // hiccup must never fail the API response. Mirror waitlist's pattern:
  // catch on the promise, log, and hand it to ctx.waitUntil.
  const fields = [
    ['Name', data.name],
    ['Email', data.email],
    ['Company', data.company],
    ['Budget', data.budget],
    ['Timeline', data.timeline],
    ['Project idea', data.project_idea],
    ['Message', data.message],
    ['UTM', Object.keys(data.utm).length ? JSON.stringify(data.utm) : ''],
    ['Received', timestamp],
  ];
  const notifyText = fields
    .map(([label, value]) => `${label}: ${value || '—'}`)
    .join('\n');
  const notifyHtml = `<h2 style="font-family:Arial,sans-serif">New project inquiry</h2>
<table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">
${fields
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top"><strong>${esc(
          label
        )}</strong></td><td style="padding:4px 0;white-space:pre-wrap">${esc(
          value || '—'
        )}</td></tr>`
    )
    .join('\n')}
</table>`;

  const notify = sendEmail({
    apiKey: env.RESEND_API_KEY,
    from: 'The Audacity <obviously@theaudacity.io>',
    to: 'obviously@theaudacity.io',
    subject: `New inquiry: ${data.name || data.email}`,
    html: notifyHtml,
    text: notifyText,
    replyTo: data.email,
  }).catch((err) => {
    console.error('inquiry_notify_failed', data.email, err?.message || err);
  });

  const autoReply = sendEmail({
    apiKey: env.RESEND_API_KEY,
    from: 'The Audacity <obviously@theaudacity.io>',
    to: data.email,
    subject: inquirySubject,
    html: inquiryHtml(data.name),
    text: inquiryText(data.name),
    replyTo: 'obviously@theaudacity.io',
  }).catch((err) => {
    console.error('inquiry_autoreply_failed', data.email, err?.message || err);
  });

  context.waitUntil(Promise.all([notify, autoReply]));

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: corsHeaders,
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': CORS_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
