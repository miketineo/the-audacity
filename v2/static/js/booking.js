// Diagnostic call slot picker. Shared by theaudacity.io (this file) and
// miketineo.com (a copy at js/booking.js there: keep the two in step).
//
// Markup: <div data-booking data-brand="audacity|miketineo" data-api="<base>"
//   data-price="€175" data-email="<fallback address>"><div data-booking-root></div></div>
// Flow: GET <api>/slots -> pick a day and time -> name, email, what you want to
// build -> POST <api>/hold -> redirect to the Stripe Payment Link. The slot is
// held while the booker pays; nothing is booked without a payment.
// Vanilla, no dependencies, never throws into the page.
(function () {
  const root = document.querySelector('[data-booking]');
  const mount = root && root.querySelector('[data-booking-root]');
  if (!root || !mount) return;

  const api = root.getAttribute('data-api') || '/api/booking';
  const brand = root.getAttribute('data-brand');
  const price = root.getAttribute('data-price') || '€175';
  const email = root.getAttribute('data-email') || '';
  const test = new URLSearchParams(location.search).get('booking_test') || '';
  const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return ''; } })();

  const track = (event, props) => {
    // theaudacity.io defines audacityTrack, miketineo.com phTrack.
    try { (window.audacityTrack || window.phTrack)?.(event, Object.assign({ provider: 'stripe', brand }, props)); } catch (e) {}
  };

  // Every element the picker creates carries the scope attributes of its root,
  // so scoped stylesheets (data-s-<component>) reach it.
  const scope = [...root.attributes].filter((a) => a.name.startsWith('data-s-')).map((a) => a.name);
  function h(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    for (const s of scope) n.setAttribute(s, '');
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === false || v == null) continue;
      if (k === 'class') n.className = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const k of kids.flat()) if (k != null) n.append(k.nodeType ? k : document.createTextNode(String(k)));
    return n;
  }

  const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const longFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const timeFmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });
  const keyFmt = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });

  let days = []; // [{ key, date, slots: [{start, end}] }]
  let day = null;
  let slot = null;

  const status = h('p', { class: 'bk-status text-dim', role: 'status', 'aria-live': 'polite' });
  const dayList = h('div', { class: 'bk-days', role: 'group', 'aria-label': 'Day' });
  const slotList = h('div', { class: 'bk-slots', role: 'group', 'aria-label': 'Time' });
  const tzNote = h('p', { class: 'bk-tz text-dim' }, `45 minutes. Times shown in your time zone${tz ? ` (${tz})` : ''}.`);
  const fail = () => h('span', {}, 'Booking is unavailable right now. ', email ? h('a', { href: `mailto:${email}?subject=Diagnostic%20call` }, `Write to ${email}`) : 'Try again later', '.');

  const form = h('form', { class: 'bk-form', hidden: true, novalidate: true });
  const chosen = h('p', { class: 'bk-chosen' });
  const field = (id, label, input) => h('div', { class: 'bk-field' }, h('label', { for: id }, label), input);
  const fName = h('input', { id: 'bk-name', name: 'name', type: 'text', required: true, autocomplete: 'name', maxlength: '100' });
  const fEmail = h('input', { id: 'bk-email', name: 'email', type: 'email', required: true, autocomplete: 'email', inputmode: 'email', maxlength: '200' });
  const fAgenda = h('textarea', { id: 'bk-agenda', name: 'agenda', rows: '4', required: true, maxlength: '1500' });
  const submit = h('button', { class: 'btn btn--primary btn--md bk-submit', type: 'submit', 'data-s-button': 'true' }, `Pay ${price} and confirm`);
  const formStatus = h('p', { class: 'bk-form-status', role: 'status', 'aria-live': 'polite' });
  const back = h('button', { class: 'bk-back', type: 'button', onclick: () => { form.hidden = true; slotList.querySelector('[aria-pressed="true"]')?.focus(); } }, 'Change time');
  form.append(
    chosen,
    field('bk-name', 'Name', fName),
    field('bk-email', 'Email', fEmail),
    field('bk-agenda', 'What do you want to build?', fAgenda),
    h('div', { class: 'bk-actions' }, submit, back),
    h('p', { class: 'bk-note text-dim' }, `You pay ${price} on Stripe to confirm. The time is held for 20 minutes while you pay. The fee comes off the project price if you go ahead.`),
    formStatus
  );

  mount.replaceChildren(status, dayList, slotList, tzNote, form);

  function renderDays() {
    dayList.replaceChildren(
      ...days.map((d) =>
        h('button', { type: 'button', class: 'bk-day', 'aria-pressed': String(d === day), onclick: () => pickDay(d) }, dayFmt.format(d.date))
      )
    );
  }
  function renderSlots() {
    slotList.replaceChildren(
      ...(day ? day.slots : []).map((s) =>
        h('button', { type: 'button', class: 'bk-slot', 'aria-pressed': String(s === slot), onclick: () => pickSlot(s) }, timeFmt.format(new Date(s.start)))
      )
    );
  }
  function pickDay(d) {
    day = d;
    slot = null;
    form.hidden = true;
    renderDays();
    renderSlots();
  }
  function pickSlot(s) {
    slot = s;
    renderSlots();
    chosen.textContent = `${longFmt.format(new Date(s.start))}, ${timeFmt.format(new Date(s.start))} to ${timeFmt.format(new Date(s.end))}`;
    formStatus.textContent = '';
    form.hidden = false;
    track('book_call_slot_selected');
    fName.focus();
  }

  async function load(note) {
    status.textContent = note || 'Loading open times.';
    try {
      const r = await fetch(`${api}/slots?brand=${encodeURIComponent(brand)}`, { headers: { Accept: 'application/json' } });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.error || r.status);
      const byKey = new Map();
      for (const s of data.slots) {
        const k = keyFmt.format(new Date(s.start));
        if (!byKey.has(k)) byKey.set(k, { key: k, date: new Date(s.start), slots: [] });
        byKey.get(k).slots.push(s);
      }
      days = [...byKey.values()];
      if (!days.length) {
        status.replaceChildren('No open times in the next three weeks. ', email ? h('a', { href: `mailto:${email}?subject=Diagnostic%20call` }, `Write to ${email}`) : '', '.');
        dayList.replaceChildren();
        slotList.replaceChildren();
        return;
      }
      status.textContent = note || 'Pick a day, then a time.';
      day = days.find((d) => day && d.key === day.key) || days[0];
      renderDays();
      renderSlots();
    } catch (e) {
      status.replaceChildren(fail());
    }
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!slot) return;
    for (const f of [fName, fEmail, fAgenda]) f.setAttribute('aria-invalid', String(!f.checkValidity()));
    const bad = [fName, fEmail, fAgenda].find((f) => !f.checkValidity());
    if (bad) {
      formStatus.textContent = bad === fEmail ? 'Enter a valid email address.' : 'Fill in every field.';
      bad.focus();
      return;
    }
    submit.disabled = true;
    formStatus.textContent = 'Holding your time.';
    try {
      const r = await fetch(`${api}/hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand, start: slot.start, name: fName.value, email: fEmail.value, agenda: fAgenda.value, test: test || undefined }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok && data.ok && data.url) {
        track('book_call_checkout');
        formStatus.textContent = 'Opening the payment page.';
        location.assign(data.url);
        return;
      }
      submit.disabled = false;
      if (data.error === 'slot_taken') {
        form.hidden = true;
        slot = null;
        await load('That time was just taken. Pick another.');
      } else if (data.error === 'too_many_holds') {
        formStatus.textContent = 'You already hold a time. Finish that payment or wait 20 minutes.';
      } else if (data.error === 'invalid_email') {
        formStatus.textContent = 'Enter a valid email address.';
      } else {
        formStatus.replaceChildren(fail());
      }
    } catch (e) {
      submit.disabled = false;
      formStatus.replaceChildren(fail());
    }
  });

  // book_call_started once, when the booking surface first becomes visible.
  let fired = false;
  const fire = () => { if (!fired) { fired = true; track('book_call_started'); } };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && fire()), { threshold: 0.4 }).observe(root);
  } else {
    fire();
  }

  load();
})();
