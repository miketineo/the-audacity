// Minimal Resend REST client for Cloudflare Pages Functions.
// Throws on real failures so callers using ctx.waitUntil() can log them.
// Returns null (not throwing) only when apiKey is absent — lets the waitlist
// endpoint keep working in local dev without secrets.

export async function sendEmail({ apiKey, from, to, subject, html, text, replyTo }) {
  if (!apiKey) {
    console.warn('sendEmail skipped: RESEND_API_KEY is not set');
    return null;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      reply_to: replyTo,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`resend_http_${response.status}: ${errText}`);
  }

  return await response.json();
}
