// Approve or reject the auto-reply to one inquiry (SEC-11). See _lib/approval.js.
//
// GET  ?t=<token>          confirmation page only; never decides (Slack unfurls links).
// POST t=<token>&action=   approve | reject. First decision wins, recorded in KV.
//
// Approve sends the FIXED template from _lib/emails/inquiry.js to the stored
// address. With RESEND_API_KEY unset, sendEmail() is a logged no-op and the
// decision is still recorded. Nothing the submitter wrote is rendered here.

import { sendEmail } from '../_lib/resend.js';
import { verifyToken, DECISION_PREFIX } from '../_lib/approval.js';
import { inquirySubject, inquiryHtml, inquiryText } from '../_lib/emails/inquiry.js';

const HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'",
};

function page(status, title, body) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{font-family:system-ui,sans-serif;max-width:32rem;margin:3rem auto;padding:0 1rem;line-height:1.5}
button{font:inherit;padding:.5rem 1rem;margin-right:.5rem;cursor:pointer}</style></head>
<body><h1>${title}</h1>${body}</body></html>`;
  return new Response(html, { status, headers: HEADERS });
}

// Only these fixed strings are ever interpolated; the token is base64url + '.'.
const REFUSED = {
  not_configured: 'Approval is not configured on this deployment.',
  malformed: 'This approval link is invalid.',
  bad_signature: 'This approval link is invalid.',
  expired: 'This approval link has expired (links last 7 days).',
};

async function load(env, token) {
  const v = await verifyToken(env.INQUIRY_APPROVAL_SECRET, token);
  if (!v.ok) return { refused: page(403, 'Refused', `<p>${REFUSED[v.reason]}</p>`), reason: v.reason };
  const decided = await env.WAITLIST.get(DECISION_PREFIX + v.key);
  if (decided) {
    const d = JSON.parse(decided);
    const what = d.action === 'approve' ? 'approved' : 'rejected';
    return { refused: page(409, 'Already decided', `<p>This inquiry was already ${what} at ${d.at.replace(/[^0-9TZ:.-]/g, '')}. Links are single use.</p>`), reason: 'already_decided' };
  }
  const raw = await env.WAITLIST.get(v.key);
  if (!raw) return { refused: page(404, 'Not found', '<p>That inquiry no longer exists.</p>'), reason: 'missing_record' };
  return { key: v.key, record: JSON.parse(raw) };
}

export async function onRequestGet({ request, env }) {
  const token = new URL(request.url).searchParams.get('t') || '';
  const r = await load(env, token);
  if (r.refused) return r.refused;
  return page(200, 'Inquiry auto-reply', `<p>Send the standard "Got it. A human is reading this." reply to this inquiry's sender?
The email is a fixed template: nothing the submitter wrote is included.</p>
<form method="post"><input type="hidden" name="t" value="${token}">
<button name="action" value="approve">Approve and send</button>
<button name="action" value="reject">Reject</button></form>`);
}

export async function onRequestPost({ request, env }) {
  let token = '';
  let action = '';
  try {
    const form = await request.formData();
    token = String(form.get('t') || '');
    action = String(form.get('action') || '');
  } catch {
    return page(400, 'Refused', '<p>Bad request.</p>');
  }
  if (action !== 'approve' && action !== 'reject') return page(400, 'Refused', '<p>Unknown action.</p>');

  const r = await load(env, token);
  if (r.refused) {
    console.warn('inquiry_decision_refused', JSON.stringify({ reason: r.reason, action }));
    return r.refused;
  }

  const at = new Date().toISOString();
  // Record first: if the send then fails, the link is still spent and the
  // failure is in the log, rather than a retry double-sending.
  await env.WAITLIST.put(DECISION_PREFIX + r.key, JSON.stringify({ action, at }));

  if (action === 'reject') {
    console.log('inquiry_decision', JSON.stringify({ action, key: r.key }));
    return page(200, 'Rejected', '<p>Recorded. No email was sent.</p>');
  }

  const to = typeof r.record.email === 'string' ? r.record.email : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    console.error('inquiry_decision_bad_address', JSON.stringify({ key: r.key }));
    return page(422, 'Not sent', '<p>Approval recorded, but the stored address is not valid. No email was sent.</p>');
  }
  try {
    const sent = await sendEmail({
      apiKey: env.RESEND_API_KEY,
      from: 'The Audacity <obviously@theaudacity.io>',
      to,
      subject: inquirySubject,
      html: inquiryHtml(),
      text: inquiryText(),
      replyTo: 'obviously@theaudacity.io',
    });
    console.log('inquiry_decision', JSON.stringify({ action, key: r.key, sent: sent !== null }));
    return page(200, 'Approved', sent === null
      ? '<p>Recorded. Email sending is switched off on this deployment (no RESEND_API_KEY), so nothing went out.</p>'
      : '<p>Recorded and sent.</p>');
  } catch (err) {
    console.error('inquiry_decision_send_failed', JSON.stringify({ key: r.key, error: String(err?.message || err).slice(0, 200) }));
    return page(502, 'Send failed', '<p>Approval recorded, but the email provider refused the send. Check the logs.</p>');
  }
}
