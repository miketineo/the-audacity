import { sendEmail } from '../_lib/resend.js';
import { notifySlack } from '../_lib/slack.js';
import { verifyTurnstile, origin, capture } from '../_lib/guard.js';

// Slack mrkdwn: neutralise <!channel>, <@user> and <url|label> in submitted text.
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
import { welcomeSubject, welcomeHtml, welcomeText } from '../_lib/emails/welcome.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://theaudacity.io',
    'Content-Type': 'application/json',
  };

  const sender = origin(request);
  let raw = null;
  let email, project, turnstileToken;
  try {
    raw = await request.text();
    const body = JSON.parse(raw);
    turnstileToken = body.turnstile;
    email = (body.email || '').trim().toLowerCase();
    project = (body.project || '').trim().slice(0, 300);
  } catch {
    capture(context, 'waitlist', raw, sender, 'invalid_body');
    return new Response(JSON.stringify({ ok: false, error: 'invalid_body' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    capture(context, 'waitlist', raw, sender, 'invalid_email');
    return new Response(JSON.stringify({ ok: false, error: 'invalid_email' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const bot = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET, sender.ip);
  if (!bot.ok) {
    console.warn('waitlist_bot_check_failed', JSON.stringify({ reason: bot.reason, ...sender }));
    capture(context, 'waitlist', raw, sender, `bot_check_failed:${bot.reason}`);
    return new Response(JSON.stringify({ ok: false, error: 'bot_check_failed' }), {
      status: 403,
      headers: corsHeaders,
    });
  }

  const key = `email:${email}`;
  const existing = await env.WAITLIST.get(key);
  capture(context, 'waitlist', raw, sender, existing ? 'accepted_duplicate' : 'accepted');

  if (!existing) {
    await env.WAITLIST.put(key, JSON.stringify({
      email,
      project,
      timestamp: new Date().toISOString(),
      origin: sender,
    }));

    // Fire-and-forget welcome. If Resend fails we log and move on — the
    // signup is already persisted and a missed welcome is not worth failing
    // the API response for.
    const welcomeSend = sendEmail({
      apiKey: env.RESEND_API_KEY,
      from: 'The Audacity <obviously@theaudacity.io>',
      to: email,
      subject: welcomeSubject,
      html: welcomeHtml,
      text: welcomeText,
      replyTo: 'obviously@theaudacity.io',
    }).catch((err) => {
      console.error('welcome_email_failed', email, err?.message || err);
    });

    // Slack ping so a signup is never silent (API contract unchanged).
    const slackPing = notifySlack({
      webhookUrl: env.SLACK_WEBHOOK_URL,
      text: `:tada: *New waitlist signup* (untrusted external input)\n${esc(email)}${project ? `\nProject: ${esc(project)}` : ''}`,
    }).catch((err) => {
      console.error('waitlist_slack_failed', email, err?.message || err);
    });

    context.waitUntil(Promise.all([welcomeSend, slackPing]));
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: corsHeaders,
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://theaudacity.io',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
