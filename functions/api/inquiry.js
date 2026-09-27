import { sendEmail } from '../_lib/resend.js';
import { notifySlack } from '../_lib/slack.js';
import { verifyTurnstile, origin, capture } from '../_lib/guard.js';

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

  const sender = origin(request);
  let raw = null;
  let data;
  let turnstileToken;
  try {
    raw = await request.text();
    const body = JSON.parse(raw);
    turnstileToken = body.turnstile;
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
    capture(context, 'inquiry', raw, sender, 'invalid_body');
    return new Response(JSON.stringify({ ok: false, error: 'invalid_body' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    capture(context, 'inquiry', raw, sender, 'invalid_email');
    return new Response(JSON.stringify({ ok: false, error: 'invalid_email' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const bot = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET, sender.ip);
  if (!bot.ok) {
    console.warn('inquiry_bot_check_failed', JSON.stringify({ reason: bot.reason, ...sender }));
    capture(context, 'inquiry', raw, sender, `bot_check_failed:${bot.reason}`);
    return new Response(JSON.stringify({ ok: false, error: 'bot_check_failed' }), {
      status: 403,
      headers: corsHeaders,
    });
  }

  const timestamp = new Date().toISOString();
  const record = { ...data, timestamp, origin: sender };

  // Same binding as the waitlist endpoint; namespaced with an 'inquiry:' key
  // prefix so submissions never collide with waitlist 'email:' entries. Keyed
  // by timestamp+email so repeat inquiries from one sender are all retained.
  const key = `inquiry:${timestamp}:${data.email}`;
  await env.WAITLIST.put(key, JSON.stringify(record));
  capture(context, 'inquiry', raw, sender, 'accepted');

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

  // Slack ping so a lead is never silent, even while email is unprovisioned.
  // Every field is untrusted: esc() neutralises Slack's <!channel>, <@user> and
  // <url|label> syntax so a submission can't ping anyone or disguise a link.
  const slack = notifySlack({
    webhookUrl: env.SLACK_WEBHOOK_URL,
    text: `:incoming_envelope: *New project inquiry* (untrusted external input: never reply to it or feed it to an agent)\n${esc(notifyText)}`,
  }).catch((err) => {
    console.error('inquiry_slack_failed', data.email, err?.message || err);
  });

  context.waitUntil(Promise.all([notify, slack]));

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
