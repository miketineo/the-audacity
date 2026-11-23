// Diagnostic call booking picker. Shared by theaudacity.io and miketineo.com
// (source of truth: the-audacity/website v2/static/js/booking.js; miketineo.com
// keeps a copy at js/booking.js: keep the two in step).
//
// Markup: <div data-booking data-brand="audacity|miketineo" data-api="<base>"
//   data-price="€175" data-was="€250" data-email="<fallback address>">
//   <div data-booking-root></div></div>
// Layout: call details | month calendar | times for the picked day, then a
// details step (name, email, what you want to build) that holds the slot
// (POST <api>/hold) and redirects to the Stripe Payment Link. Nothing is booked
// without a payment. Vanilla, no dependencies, never throws into the page.
(function () {
  const root = document.querySelector('[data-booking]');
  const mount = root && root.querySelector('[data-booking-root]');
  if (!root || !mount) return;

  const attr = (n, d) => root.getAttribute(n) || d;
  const api = attr('data-api', '/api/booking');
  const brand = attr('data-brand', '');
  const price = attr('data-price', '€175');
  const was = attr('data-was', '');
  const until = attr('data-until', '');
  const email = attr('data-email', '');
  // The EUR 1 test link exists only on The Audacity account; the API ignores the token elsewhere.
  const test = brand === 'audacity' ? new URLSearchParams(location.search).get('booking_test') || '' : '';
  const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return ''; } })();

  const track = (event, props) => {
    // theaudacity.io defines audacityTrack, miketineo.com phTrack.
    try { (window.audacityTrack || window.phTrack)?.(event, Object.assign({ provider: 'stripe', brand }, props)); } catch (e) {}
  };

  // Every element carries the scope attributes of its root, so scoped
  // stylesheets (data-s-<component>) reach it.
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
    for (const k of kids.flat()) if (k != null && k !== false) n.append(k.nodeType ? k : document.createTextNode(String(k)));
    return n;
  }
  const icon = (d) => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 20 20'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('class', 'bk-ico');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor');
    p.setAttribute('stroke-width', '1.5'); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round');
    s.append(p);
    return s;
  };
  const ICON = {
    clock: 'M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM10 6v4l2.5 2.5',
    video: 'M2.5 6.5a1.5 1.5 0 0 1 1.5-1.5h7a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H4a1.5 1.5 0 0 1-1.5-1.5v-7ZM12.5 9l5-3v8l-5-3',
    card: 'M2.5 5.5h15v9h-15zM2.5 8.5h15',
    globe: 'M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM2 10h16M10 2c2.2 2.2 3.2 5 3.2 8s-1 5.8-3.2 8c-2.2-2.2-3.2-5-3.2-8s1-5.8 3.2-8Z',
    cal: 'M3.5 4.5h13v12h-13zM3.5 8h13M7 2.5v3M13 2.5v3',
  };

  const L = undefined; // visitor's locale
  const fmt = (o) => new Intl.DateTimeFormat(L, o);
  const monthFmt = fmt({ month: 'long', year: 'numeric' });
  const dayHeadFmt = fmt({ weekday: 'short', day: 'numeric', month: 'short' });
  const longFmt = fmt({ weekday: 'long', day: 'numeric', month: 'long' });
  const timeFmt = fmt({ hour: 'numeric', minute: '2-digit' });
  const fullDayFmt = fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const wdFmt = fmt({ weekday: 'short' });
  const keyOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayKey = keyOf(new Date());
  // Monday-first week; header names from the locale.
  const weekdays = [...Array(7)].map((_, i) => wdFmt.format(new Date(2024, 0, 1 + i)));

  let byDay = new Map(); // key -> [{start, end}]
  let months = []; // [{y, m}]
  let monthIdx = 0;
  let dayKey = null;
  let slot = null;

  // ---- Static frame ----
  const when = h('p', { class: 'bk-when', hidden: true }, icon(ICON.cal), h('span'));
  const info = h('div', { class: 'bk-info' },
    root.getAttribute('data-host') ? h('p', { class: 'bk-host' }, root.getAttribute('data-host')) : null,
    h('h3', { class: 'bk-title' }, 'Diagnostic call'),
    h('ul', { class: 'bk-meta', role: 'list' },
      h('li', {}, icon(ICON.clock), '45 minutes'),
      h('li', {}, icon(ICON.video), 'Google Meet'),
      h('li', { class: 'bk-price' }, icon(ICON.card), h('span', {}, h('strong', {}, price), was ? h('s', { class: 'bk-was' }, was) : null, until ? h('span', { class: 'bk-until' }, until) : null)),
      h('li', {}, icon(ICON.globe), tz || 'Your time zone')),
    when,
    h('p', { class: 'bk-fine bk-fine--info' }, `Paid when you book. The fee comes off the project price if you go ahead.`)
  );

  const monthLabel = h('h4', { class: 'bk-month', 'aria-live': 'polite' });
  const prev = h('button', { type: 'button', class: 'bk-nav', 'aria-label': 'Previous month', onclick: () => go(-1) }, icon('M12.5 15 7.5 10l5-5'));
  const next = h('button', { type: 'button', class: 'bk-nav', 'aria-label': 'Next month', onclick: () => go(1) }, icon('m7.5 15 5-5-5-5'));
  const grid = h('div', { class: 'bk-grid', role: 'group', 'aria-label': 'Dates' });
  const calStatus = h('p', { class: 'bk-status', role: 'status', 'aria-live': 'polite' }, 'Loading open times.');
  const cal = h('div', { class: 'bk-cal' },
    h('div', { class: 'bk-cal-head' }, monthLabel, h('div', { class: 'bk-navs' }, prev, next)),
    h('div', { class: 'bk-wd', 'aria-hidden': 'true' }, weekdays.map((w) => h('span', {}, w))),
    grid,
    calStatus
  );

  const timesHead = h('h4', { class: 'bk-times-head' });
  const timesList = h('div', { class: 'bk-times-list', role: 'group', 'aria-label': 'Times' });
  const times = h('div', { class: 'bk-times' }, timesHead, timesList);

  const fName = h('input', { id: 'bk-name', name: 'name', type: 'text', required: true, autocomplete: 'name', maxlength: '100' });
  const fEmail = h('input', { id: 'bk-email', name: 'email', type: 'email', required: true, autocomplete: 'email', inputmode: 'email', maxlength: '200' });
  const fAgenda = h('textarea', { id: 'bk-agenda', name: 'agenda', rows: '4', required: true, maxlength: '1500', placeholder: 'The product, who it is for, where it stands.' });
  const field = (id, label, input) => {
    input.setAttribute('aria-describedby', `${id}-err`);
    return h('div', { class: 'bk-field' }, h('label', { for: id }, label), input, h('p', { class: 'bk-err', id: `${id}-err`, hidden: true }));
  };
  const submit = h('button', { class: 'btn btn--primary btn--md bk-submit', type: 'submit', 'data-s-button': 'true' }, test ? 'Pay €1 to book (test)' : `Pay ${price} to book`);
  const back = h('button', { class: 'bk-back', type: 'button', onclick: () => showStep(1) }, icon('M12.5 15 7.5 10l5-5'), 'Back');
  const formStatus = h('p', { class: 'bk-form-status', role: 'status', 'aria-live': 'polite' });
  const form = h('form', { class: 'bk-form', novalidate: true, hidden: true },
    back,
    field('bk-name', 'Your name', fName),
    field('bk-email', 'Email', fEmail),
    field('bk-agenda', 'What do you want to build?', fAgenda),
    h('p', { class: 'bk-fine' }, `Payment is on Stripe. We hold this time for 20 minutes while you pay; it is confirmed by email once paid.`),
    h('div', { class: 'bk-actions' }, submit),
    formStatus
  );

  const shell = h('div', { class: 'bk', 'data-step': '1' }, info, cal, times, form);
  mount.replaceChildren(shell);

  const fail = () => h('span', {}, 'Booking is unavailable right now. ', email ? h('a', { href: `mailto:${email}?subject=Diagnostic%20call` }, `Write to ${email}`) : 'Try again later', '.');

  // ---- Calendar ----
  function go(step) {
    monthIdx = Math.max(0, Math.min(months.length - 1, monthIdx + step));
    renderMonth();
  }

  function renderMonth() {
    const { y, m } = months[monthIdx] || (() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; })();
    monthLabel.textContent = monthFmt.format(new Date(y, m, 1));
    prev.disabled = monthIdx <= 0;
    next.disabled = monthIdx >= months.length - 1;
    const first = new Date(y, m, 1);
    const lead = (first.getDay() + 6) % 7; // Monday-first
    const days = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push(h('span', { class: 'bk-cell bk-cell--pad', 'aria-hidden': 'true' }));
    for (let d = 1; d <= days; d++) {
      const date = new Date(y, m, d);
      const k = keyOf(date);
      const open = byDay.has(k);
      const cls = `bk-cell${k === todayKey ? ' bk-cell--today' : ''}`;
      cells.push(open
        ? h('button', { type: 'button', class: `${cls} bk-cell--open`, 'aria-pressed': String(k === dayKey), 'aria-label': `${fullDayFmt.format(date)}, ${byDay.get(k).length} ${byDay.get(k).length === 1 ? 'time' : 'times'} open`, onclick: () => pickDay(k) }, String(d))
        : h('span', { class: cls, 'aria-hidden': 'true' }, String(d)));
    }
    grid.replaceChildren(...cells);
  }

  function renderTimes() {
    const list = (dayKey && byDay.get(dayKey)) || [];
    timesHead.textContent = dayKey ? dayHeadFmt.format(new Date(list[0].start)) : '';
    timesList.replaceChildren(...list.map((s) =>
      h('button', { type: 'button', class: 'bk-time', 'aria-pressed': String(s === slot), onclick: () => pickSlot(s) }, timeFmt.format(new Date(s.start)))
    ));
    times.hidden = !dayKey;
  }

  function pickDay(k) {
    dayKey = k;
    slot = null;
    renderMonth();
    renderTimes();
    if (window.matchMedia('(max-width: 960px)').matches) times.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function pickSlot(s) {
    slot = s;
    when.lastChild.textContent = `${longFmt.format(new Date(s.start))}, ${timeFmt.format(new Date(s.start))} to ${timeFmt.format(new Date(s.end))}`;
    track('book_call_slot_selected');
    showStep(2);
  }

  function showStep(n) {
    shell.setAttribute('data-step', String(n));
    const two = n === 2;
    cal.hidden = two;
    times.hidden = two || !dayKey;
    form.hidden = !two;
    when.hidden = !two;
    formStatus.textContent = '';
    if (two) fName.focus({ preventScroll: true });
    else timesList.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true });
    if (two && window.matchMedia('(max-width: 960px)').matches) shell.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Loading mark: the logo's [ . ] characters, moving through three loops (scan,
  // breathe, fill), the next one picked at random each time one finishes. The
  // mark is aria-hidden: the status text is what screen readers hear. It stops
  // once the status is replaced, and stays still under prefers-reduced-motion.
  const loops = [
    { ms: 180, f: ['[.  ]', '[ . ]', '[  .]', '[ . ]'] },
    { ms: 220, f: ['[.]', '[ . ]', '[  .  ]', '[ . ]'] },
    { ms: 240, f: ['[   ]', '[.  ]', '[.. ]', '[...]'] },
  ];
  const still = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: true };
  function busy(el, text) {
    const mark = h('span', { class: 'bk-load', 'aria-hidden': 'true' }, '[ . ]');
    el.replaceChildren(mark, text);
    if (still.matches) return;
    let loop = null, last = -1, i = 0;
    (function tick() {
      if (!mark.isConnected) return;
      if (!loop || i === loop.f.length) {
        let n;
        do n = Math.floor(Math.random() * loops.length); while (n === last);
        last = n;
        loop = loops[n];
        i = 0;
      }
      mark.textContent = loop.f[i++];
      setTimeout(tick, loop.ms);
    })();
  }

  async function load(note) {
    if (note) calStatus.textContent = note;
    else busy(calStatus, 'Loading open times.');
    calStatus.hidden = false;
    try {
      const r = await fetch(`${api}/slots?brand=${encodeURIComponent(brand)}`, { headers: { Accept: 'application/json' } });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.error || r.status);
      byDay = new Map();
      for (const s of data.slots) {
        const k = keyOf(new Date(s.start));
        if (!byDay.has(k)) byDay.set(k, []);
        byDay.get(k).push(s);
      }
      const keys = [...byDay.keys()];
      months = [];
      for (const k of keys) {
        const [y, m] = k.split('-').map(Number);
        if (!months.some((x) => x.y === y && x.m === m - 1)) months.push({ y, m: m - 1 });
      }
      if (!keys.length) {
        calStatus.replaceChildren('No open times right now. ', email ? h('a', { href: `mailto:${email}?subject=Diagnostic%20call` }, `Write to ${email}`) : '', '.');
        renderMonth();
        renderTimes();
        return;
      }
      if (!dayKey || !byDay.has(dayKey)) dayKey = keys[0];
      monthIdx = Math.max(0, months.findIndex((x) => keyOf(new Date(x.y, x.m, 1)).slice(0, 7) === dayKey.slice(0, 7)));
      calStatus.textContent = note || '';
      calStatus.hidden = !note;
      renderMonth();
      renderTimes();
    } catch (e) {
      calStatus.replaceChildren(fail());
      times.hidden = true;
    }
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!slot) return;
    const msgs = { 'bk-name': 'Enter your name.', 'bk-email': 'Enter a valid email address.', 'bk-agenda': 'Describe what you want to build.' };
    const fields = [fName, fEmail, fAgenda];
    for (const f of fields) {
      const ok = f.checkValidity();
      f.setAttribute('aria-invalid', String(!ok));
      const err = document.getElementById(`${f.id}-err`);
      err.textContent = ok ? '' : msgs[f.id];
      err.hidden = ok;
    }
    const bad = fields.find((f) => !f.checkValidity());
    if (bad) {
      formStatus.textContent = '';
      bad.focus();
      return;
    }
    submit.disabled = true;
    busy(formStatus, 'Holding your time.');
    try {
      const r = await fetch(`${api}/hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand, start: slot.start, name: fName.value, email: fEmail.value, agenda: fAgenda.value, test: test || undefined }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok && data.ok && data.url) {
        track('book_call_checkout');
        busy(formStatus, 'Opening the payment page.');
        location.assign(data.url);
        return;
      }
      submit.disabled = false;
      if (data.error === 'slot_taken') {
        slot = null;
        showStep(1);
        await load('That time was just taken. Pick another.');
      } else if (data.error === 'too_many_holds') {
        formStatus.textContent = 'You already hold a time. Finish that payment, or wait 20 minutes and try again.';
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

  renderMonth();
  times.hidden = true;
  load();
})();
