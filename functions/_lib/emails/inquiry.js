// Auto-reply to a project inquiry, sent ONLY after a human approves it
// (SEC-11, functions/api/inquiry-decision.js). The template is FIXED: it takes
// no arguments and carries no submitter-supplied text, not even the name, so an
// approved send can never relay attacker content from theaudacity.io.

export const inquirySubject = "Got it. A human is reading this.";

export function inquiryText() {
  return `Hey there,

Your inquiry came through. A human is reading it. Not a bot,
not a queue, not a ticket that dies in a CRM.

Here's how this works. The Audacity is an Agentic Engineering
Studio. A crew of AI agents builds. One human makes sure they
don't ship garbage. That means we move fast, but we read every
word you sent us before we reply.

What happens next: within a couple of days you'll get a real
answer from a real person. Not a calendar link, not a
qualification form. A reply about the thing you want built,
whether it's a fit, and what a first sprint could look like.

If you want to add anything you forgot, just reply to this
email. It goes straight to us.

Talk soon,
The Audacity studio

The Audacity, theaudacity.io
An Agentic Engineering Studio. AI agents build. One human
ensures quality.
Reply here or write to obviously@theaudacity.io.
`;
}

export function inquiryHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Got it.</title>
</head>
<body style="margin:0;padding:0;background:#fafaf8;color:#0e0e10;font-family:Inter,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#fafaf8;">A human is reading your inquiry. Here's what happens next.</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fafaf8;">
  <tr>
    <td align="center" style="padding:48px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">

        <tr>
          <td style="padding:0 0 24px 0;border-bottom:1px solid #ececea;">
            <span style="font-family:ui-monospace,'SFMono-Regular',Menlo,Consolas,'Courier New',monospace;font-size:12px;font-weight:700;letter-spacing:0.08em;color:#0e0e10;">[.] THE AUDACITY</span>
          </td>
        </tr>

        <tr>
          <td style="padding:48px 0 24px 0;">
            <h1 style="margin:0;font-family:Inter,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-weight:800;font-size:40px;line-height:1.05;letter-spacing:-0.02em;color:#0e0e10;">Got it.</h1>
          </td>
        </tr>

        <tr>
          <td style="padding:16px 0 8px 0;">
            <p style="margin:0 0 20px 0;color:#0e0e10;">Hey there, your inquiry came through. A human is reading it. Not a bot, not a queue, not a ticket that dies in a CRM.</p>

            <p style="margin:0 0 20px 0;color:#0e0e10;">Here's how this works. The Audacity is an Agentic Engineering Studio. A crew of AI agents builds. One human makes sure they don't ship garbage. That means we move fast, but we read every word you sent us before we reply.</p>

            <p style="margin:0 0 12px 0;color:#5b5b5f;font-family:ui-monospace,'SFMono-Regular',Menlo,Consolas,'Courier New',monospace;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">What happens next</p>

            <p style="margin:0 0 20px 0;color:#0e0e10;">Within a couple of days you'll get a real answer from a real person. Not a calendar link, not a qualification form. A reply about the thing you want built, whether it's a fit, and what a first sprint could look like.</p>

            <p style="margin:0 0 32px 0;color:#0e0e10;">If you want to add anything you forgot, just reply to this email. It goes straight to us.</p>

            <p style="margin:0 0 8px 0;color:#0e0e10;font-weight:600;">The Audacity studio</p>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 0 0 0;border-top:1px solid #ececea;">
            <p style="margin:24px 0 8px 0;font-size:12px;line-height:1.6;color:#5b5b5f;">
              <strong style="color:#0e0e10;">The Audacity</strong> &middot; <a href="https://theaudacity.io" style="color:#0e0e10;text-decoration:underline;">theaudacity.io</a>
            </p>
            <p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:#5b5b5f;">An Agentic Engineering Studio. AI agents build. One human ensures quality.</p>
            <p style="margin:0 0 16px 0;font-size:12px;line-height:1.6;color:#5b5b5f;">Reply to this email, or write to <a href="mailto:obviously@theaudacity.io" style="color:#0e0e10;text-decoration:underline;">obviously@theaudacity.io</a>.</p>
            <p style="margin:0;font-size:12px;line-height:1.6;color:#5b5b5f;">You're getting this because you sent a project inquiry at theaudacity.io.</p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
