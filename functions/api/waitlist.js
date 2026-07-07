import { sendEmail } from '../_lib/resend.js';
import { welcomeSubject, welcomeHtml, welcomeText } from '../_lib/emails/welcome.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://theaudacity.io',
    'Content-Type': 'application/json',
  };

  let email, project;
  try {
    const body = await request.json();
    email = (body.email || '').trim().toLowerCase();
    project = (body.project || '').trim().slice(0, 300);
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'invalid_body' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ ok: false, error: 'invalid_email' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const key = `email:${email}`;
  const existing = await env.WAITLIST.get(key);

  if (!existing) {
    await env.WAITLIST.put(key, JSON.stringify({
      email,
      project,
      timestamp: new Date().toISOString(),
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

    context.waitUntil(welcomeSend);
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
