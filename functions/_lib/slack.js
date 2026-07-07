// Minimal Slack incoming-webhook notifier for lead events.
//
// Fire-and-forget from Pages Functions, same pattern as resend.js: callers
// catch on the promise and hand it to ctx.waitUntil. An absent webhookUrl is
// a silent no-op so local dev and unconfigured environments never break.
// SLACK_WEBHOOK_URL is set as an encrypted env var on the Pages project.
export async function notifySlack({ webhookUrl, text }) {
  if (!webhookUrl) return;
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    throw new Error(`slack_webhook_${res.status}`);
  }
}
