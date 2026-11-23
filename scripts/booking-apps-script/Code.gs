// Calendar backend for the paid diagnostic call (theaudacity.io and miketineo.com).
// Web app, runs as miguel@miketineo.com, access "Anyone"; every request carries
// the shared secret held in Script Properties (SHARED_SECRET), never in code.
// Called only by functions/api/booking/* on theaudacity.io. Source of truth:
// the-audacity/website scripts/booking-apps-script/ (paste here on change).
//
// Actions:
//   freebusy {timeMin, timeMax} -> {busy:[{start,end}], booked:[{start}]}
//   create {brand, start, end, name, email, agenda, sessionId} -> {eventId, meet}
//     Idempotent: the event id is derived from the Stripe checkout session id.

const CAL = 'primary';
const TAG = 'audacityDiagnostic';
const BUFFER_MS = 15 * 60000;
const BRANDS = {
  audacity: { title: 'Diagnostic call with The Audacity', from: 'miguel@theaudacity.io', fromName: 'The Audacity', sendUpdates: 'none' },
  miketineo: { title: 'Diagnostic call with Miguel Tineo', sendUpdates: 'all' },
};

function doPost(e) {
  let req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return out_({ ok: false, error: 'bad_json' });
  }
  const secret = PropertiesService.getScriptProperties().getProperty('SHARED_SECRET');
  if (!secret || !safeEqual_(String(req.secret || ''), secret)) return out_({ ok: false, error: 'unauthorized' });
  try {
    if (req.action === 'freebusy') return out_(freebusy_(req.timeMin, req.timeMax));
    if (req.action === 'create') return out_(create_(req));
    return out_({ ok: false, error: 'unknown_action' });
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    return out_({ ok: false, error: 'internal' });
  }
}

function freebusy_(timeMin, timeMax) {
  const t0 = new Date(timeMin);
  const t1 = new Date(timeMax);
  if (isNaN(t0) || isNaN(t1) || t1 <= t0 || t1 - t0 > 40 * 86400000) return { ok: false, error: 'bad_range' };
  const fb = Calendar.Freebusy.query({ timeMin: t0.toISOString(), timeMax: t1.toISOString(), items: [{ id: CAL }] });
  const busy = (fb.calendars[CAL] || fb.calendars[Object.keys(fb.calendars)[0]]).busy || [];
  const booked = listDiagnostic_(t0, t1).map(function (ev) { return { start: ev.start.dateTime }; });
  return { ok: true, busy: busy.map(function (b) { return { start: b.start, end: b.end }; }), booked: booked };
}

function listDiagnostic_(t0, t1) {
  const res = Calendar.Events.list(CAL, {
    timeMin: t0.toISOString(), timeMax: t1.toISOString(), singleEvents: true,
    privateExtendedProperty: TAG + '=1', maxResults: 250,
  });
  return (res.items || []).filter(function (ev) { return ev.status !== 'cancelled' && ev.start && ev.start.dateTime; });
}

function create_(req) {
  const brand = BRANDS[req.brand];
  const start = new Date(req.start);
  const end = new Date(req.end);
  const email = String(req.email || '').trim();
  const name = String(req.name || '').trim().slice(0, 100);
  const agenda = String(req.agenda || '').trim().slice(0, 1500);
  if (!brand || isNaN(start) || isNaN(end) || end <= start || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !req.sessionId) {
    return { ok: false, error: 'bad_request' };
  }
  const id = eventId_(String(req.sessionId));

  const existing = getEvent_(id);
  if (existing && existing.status !== 'cancelled') {
    if (req.brand === 'audacity' && !(existing.extendedProperties && existing.extendedProperties.private && existing.extendedProperties.private.confirmationSent)) {
      sendConfirmation_(existing, brand, name, email);
    }
    return { ok: true, eventId: id, meet: existing.hangoutLink || '', existing: true };
  }

  // The slot must still be free (another booking or a personal event may have taken it).
  const fb = Calendar.Freebusy.query({
    timeMin: new Date(start.getTime() - BUFFER_MS).toISOString(),
    timeMax: new Date(end.getTime() + BUFFER_MS).toISOString(),
    items: [{ id: CAL }],
  });
  const busy = (fb.calendars[CAL] || fb.calendars[Object.keys(fb.calendars)[0]]).busy || [];
  if (busy.length) return { ok: false, error: 'slot_taken' };

  const ev = Calendar.Events.insert({
    id: id,
    summary: brand.title + ' (' + name + ')',
    description: 'Paid 45-minute diagnostic call.\n\nWhat they want to build:\n' + agenda,
    start: { dateTime: start.toISOString(), timeZone: 'Europe/Rome' },
    end: { dateTime: end.toISOString(), timeZone: 'Europe/Rome' },
    attendees: [{ email: email, displayName: name }],
    conferenceData: { createRequest: { requestId: id, conferenceSolutionKey: { type: 'hangoutsMeet' } } },
    extendedProperties: { private: { audacityDiagnostic: '1', brand: req.brand, sessionId: String(req.sessionId) } },
    guestsCanInviteOthers: false,
  }, CAL, { conferenceDataVersion: 1, sendUpdates: brand.sendUpdates });

  if (req.brand === 'audacity') sendConfirmation_(ev, brand, name, email);
  return { ok: true, eventId: id, meet: ev.hangoutLink || '' };
}

// The Audacity bookers hear from miguel@theaudacity.io (Gmail send-as alias), with an .ics.
function sendConfirmation_(ev, brand, name, email) {
  const start = new Date(ev.start.dateTime);
  const end = new Date(ev.end.dateTime);
  const meet = ev.hangoutLink || '';
  const when = Utilities.formatDate(start, 'Europe/Rome', 'EEE d MMM yyyy, HH:mm') + ' to ' + Utilities.formatDate(end, 'Europe/Rome', 'HH:mm') + ' (Rome time)';
  const body = [
    'Hi ' + name + ',',
    '',
    'Your 45-minute diagnostic call with The Audacity is booked.',
    '',
    'When: ' + when,
    'Google Meet: ' + meet,
    '',
    'The calendar file is attached. The fee comes off the project price if you go ahead.',
    'To move the call, reply to this email.',
    '',
    'The Audacity',
    'https://theaudacity.io',
  ].join('\n');
  GmailApp.sendEmail(email, 'Booked: diagnostic call with The Audacity, ' + Utilities.formatDate(start, 'Europe/Rome', 'd MMM HH:mm'), body, {
    from: brand.from,
    name: brand.fromName,
    replyTo: brand.from,
    attachments: [Utilities.newBlob(ics_(ev, meet), 'text/calendar', 'diagnostic-call.ics')],
  });
  Calendar.Events.patch({ extendedProperties: { private: { confirmationSent: new Date().toISOString() } } }, CAL, ev.id, { sendUpdates: 'none' });
}

function ics_(ev, meet) {
  const fmt = function (d) { return Utilities.formatDate(new Date(d), 'UTC', "yyyyMMdd'T'HHmmss'Z'"); };
  const txt = function (s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); };
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//The Audacity//Diagnostic call//EN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    'UID:' + ev.id + '@theaudacity.io',
    'DTSTAMP:' + fmt(new Date()),
    'DTSTART:' + fmt(ev.start.dateTime),
    'DTEND:' + fmt(ev.end.dateTime),
    'SUMMARY:' + txt('Diagnostic call with The Audacity'),
    'DESCRIPTION:' + txt('Google Meet: ' + meet),
    'LOCATION:' + txt(meet),
    'URL:' + meet,
    'ORGANIZER;CN=The Audacity:mailto:miguel@theaudacity.io',
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}

function getEvent_(id) {
  try {
    return Calendar.Events.get(CAL, id);
  } catch (err) {
    return null;
  }
}

// Calendar event ids use base32hex (a-v, 0-9); a hex SHA-256 fits.
function eventId_(sessionId) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'diag:' + sessionId)
    .map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

function safeEqual_(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Run once from the editor: authorizes Calendar and Gmail, checks the send-as
// alias, and creates SHARED_SECRET if missing. The secret is logged once so it
// can be copied into the Pages project (APPS_SCRIPT_SECRET); rotate by deleting
// the property and running setup() again.
function setup() {
  Calendar.Freebusy.query({ timeMin: new Date().toISOString(), timeMax: new Date(Date.now() + 3600000).toISOString(), items: [{ id: CAL }] });
  const aliases = GmailApp.getAliases();
  console.log('send-as aliases: ' + aliases.join(', ') + (aliases.indexOf(BRANDS.audacity.from) < 0 ? '  <-- MISSING ' + BRANDS.audacity.from : ''));
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('SHARED_SECRET')) {
    console.log('SHARED_SECRET already set (not shown)');
    return;
  }
  const secret = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  props.setProperty('SHARED_SECRET', secret);
  console.log('SHARED_SECRET=' + secret);
}
