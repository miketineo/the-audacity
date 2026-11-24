/**
 * analytics.js: consent-gated PostHog loader and event router, loaded on every
 * page as <script type="module">. Ported from components/Analytics.astro
 * (the script body is unchanged apart from the two edits noted below).
 *
 * It does FOUR things and nothing else:
 *
 *   1. Defines the canonical tracker `window.audacityTrack(event, props)` that
 *      the rest of the site calls (forms, booking embed, theme toggle).
 *   2. Loads PostHog (EU cloud) on every page in cookieless mode: until the
 *      visitor accepts, nothing is stored on the device and PostHog counts the
 *      visit from a server-side hash that rotates daily. Accepting
 *      (`audacity:consent-granted` or a stored 'granted') upgrades to normal
 *      cookie-based analytics; declining keeps it cookieless.
 *   3. Captures UTM / gclid attribution on every load (the attribution section below) and
 *      registers it as PostHog super properties so every event carries its
 *      source. The same localStorage bag rides on inquiry / waitlist payloads.
 *   4. Wires the event taxonomy: page_view, theme_toggled, cta_clicked{location},
 *      book_call_started, book_call_completed, inquiry_submitted,
 *      waitlist_joined, outbound_click.
 *
 * page_view is kept alongside PostHog's own $pageview for one migration cycle,
 * so saved insights built on it keep working. Retire it in a follow-up.
 *
 * NO ad pixels: no Google Ads, no LinkedIn, no social tags.
 *
 * KEY: the project key below is a public client key. The Astro build could
 * override it with PUBLIC_POSTHOG_KEY; there is no build step now, so the key
 * is the literal.
 *
 * Edits against the Astro script: scripts/attribution.js is folded into this
 * file (its exports became plain declarations), and the PostHog key is the
 * literal public key (the build set no PUBLIC_POSTHOG_KEY).
 */
// ---- Attribution: UTM / gclid capture (was scripts/attribution.js, one file so the page makes one request) ----
/**
 * attribution.js — UTM / source capture util (first-touch + last-touch).
 *
 * Single source of truth for marketing attribution. Reads utm_* + gclid from
 * the landing URL, persists to localStorage 'audacity-attribution', and exposes
 * the stored bag so it can ride along on inquiry / waitlist payloads and on
 * PostHog events.
 *
 * Storage shape (kept identical to the contact page's inline capture so the two
 * interoperate on the same key):
 *   {
 *     first_touch: { utm_source?, ..., gclid?, referrer, landing_page, ts },
 *     last_touch:  { ...same shape... }
 *   }
 *
 * No analytics vendor here, no consent gate here: this is pure data capture and
 * is safe to run on every page load. Sending anything off-box is the analytics
 * loader's job, and only after consent.
 */

const ATTR_KEY = 'audacity-attribution';

const PARAM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
];

/** Pull the recognised marketing params off the current URL. */
function readParams() {
  const out = {};
  try {
    const p = new URLSearchParams(location.search);
    PARAM_KEYS.forEach((k) => {
      const v = p.get(k);
      if (v) out[k] = v.slice(0, 200);
    });
  } catch (e) {}
  return out;
}

/**
 * Capture attribution for this page load. Sets first_touch once (sticky for the
 * lifetime of the browser store) and refreshes last_touch whenever new params
 * arrive (or if last_touch was never set). Returns the full stored object.
 */
function captureAttribution() {
  let store = {};
  try {
    store = JSON.parse(localStorage.getItem(ATTR_KEY) || '{}') || {};
  } catch (e) {
    store = {};
  }

  const now = readParams();
  const hasNow = Object.keys(now).length > 0;
  const touch = {
    ...now,
    referrer: (typeof document !== 'undefined' && document.referrer) || '',
    landing_page: location.pathname + location.search,
    ts: new Date().toISOString(),
  };

  if (!store.first_touch) store.first_touch = touch;
  if (hasNow || !store.last_touch) store.last_touch = touch;

  try {
    localStorage.setItem(ATTR_KEY, JSON.stringify(store));
  } catch (e) {}

  return store;
}

/** Read the stored attribution object without mutating it. */
function getAttribution() {
  try {
    return JSON.parse(localStorage.getItem(ATTR_KEY) || '{}') || {};
  } catch (e) {
    return {};
  }
}

/**
 * Flatten attribution into a single utm_* + gclid bag for event properties and
 * lead payloads. Last-touch wins; first-touch fills any gap. Non-param fields
 * (referrer / landing_page / ts) are dropped here on purpose.
 */
function getFlatUtm() {
  const store = getAttribution();
  const first = store.first_touch || {};
  const last = store.last_touch || {};
  const out = {};
  PARAM_KEYS.forEach((k) => {
    const v = last[k] || first[k];
    if (v) out[k] = v;
  });
  return out;
}
// ---- end attribution ----

(function () {
  const POSTHOG_KEY =
    'phc_CefEYSP2v97ZazvvsctE6r8iKtej6qdubPyyaM8UR7Vs';
  // Ingestion via the managed reverse proxy (serves /static assets too);
  // ui_host points links back at PostHog EU (project "The Audacity", id 160291).
  const POSTHOG_HOST = 'https://z.miketineo.com';
  const POSTHOG_UI_HOST = 'https://eu.posthog.com';

  const CONSENT_KEY = 'audacity-consent';
  const consentGranted = () => {
    try { return localStorage.getItem(CONSENT_KEY) === 'granted'; } catch (e) { return false; }
  };
  const consentDenied = () => {
    try { return localStorage.getItem(CONSENT_KEY) === 'denied'; } catch (e) { return false; }
  };

  // Capture attribution on every page load (safe pre-consent: data only).
  captureAttribution();

  let booted = false;   // PostHog snippet injected + init called
  let ready = false;    // PostHog fully loaded (loaded callback fired)
  let pageViewSent = false;
  const queue = [];     // events raised before PostHog is ready (incl. pre-consent)

  // Call-price A/B test: the variant the head script picked, only on pages that
  // show the price (home, work, contact).
  function priceVariant() {
    const v = document.documentElement.getAttribute('data-price-ab');
    return v && document.querySelector('.price-ab') ? { price_variant: v } : {};
  }

  function flat(props) {
    return Object.assign({}, getFlatUtm(), priceVariant(), props || {});
  }

  // ---- Canonical tracker the whole site calls. Events raised before PostHog
  // has loaded are buffered in-memory and flushed by the loaded callback. They
  // go out cookieless or cookie-based according to the consent state at that
  // moment. This is the only tracker: reporters call window.audacityTrack
  // directly, and Analytics.astro's script runs before any of them can fire.
  function track(event, props) {
    const payload = flat(props);
    if (ready && window.posthog) {
      window.posthog.capture(event, payload);
    } else {
      queue.push([event, payload]);
    }
  }
  window.audacityTrack = track;

  function flush() {
    while (queue.length) {
      const [event, payload] = queue.shift();
      try { window.posthog.capture(event, payload); } catch (e) {}
    }
  }

  function sendPageView() {
    if (pageViewSent || !window.posthog) return;
    pageViewSent = true;
    window.posthog.capture('page_view', flat({ path: location.pathname }));
  }

  // ---- PostHog EU loader (official array snippet). boot() runs on every
  // page load; the consent state decides cookieless vs cookie-based.
  function boot() {
    if (booted) return;
    booted = true;

    !(function (t, e) {
      var o, n, p, r;
      e.__SV || ((window.posthog = e), (e._i = []), (e.init = function (i, s, a) {
        function g(t, e) {
          var o = e.split('.');
          2 == o.length && ((t = t[o[0]]), (e = o[1])),
            (t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); });
        }
        ((p = t.createElement('script')).type = 'text/javascript'),
          (p.crossOrigin = 'anonymous'),
          (p.async = !0),
          (p.src = 'https://z.miketineo.com/static/array.js'),
          (p.onerror = function () {
            var f = t.createElement('script');
            f.async = !0;
            f.crossOrigin = 'anonymous';
            f.src = 'https://eu-assets.i.posthog.com/static/array.js';
            r.parentNode.insertBefore(f, r);
          }),
          (r = t.getElementsByTagName('script')[0]).parentNode.insertBefore(p, r);
        var u = e;
        for (
          void 0 !== a ? (u = e[a] = []) : (a = 'posthog'),
            u.people = u.people || [],
            u.toString = function (t) { var e = 'posthog'; return 'posthog' !== a && (e += '.' + a), t || (e += ' (stub)'), e; },
            u.people.toString = function () { return u.toString(1) + '.people (stub)'; },
            o = 'init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug getPageViewId'.split(' '),
            n = 0;
          n < o.length;
          n++
        ) g(u, o[n]);
        e._i.push([i, s, a]);
      }), (e.__SV = 1));
    })(document, window.posthog || []);

    window.posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      ui_host: POSTHOG_UI_HOST,
      defaults: '2026-05-30',
      person_profiles: 'identified_only',
      // Standard web analytics: one $pageview per document load (static MPA,
      // no ViewTransitions), plus autocapture narrowed to the interactive
      // elements we actually reason about.
      autocapture: { element_allowlist: ['a', 'button', 'form'] },
      capture_pageview: true,
      capture_pageleave: true,
      persistence: 'localStorage+cookie',
      // Cookieless until the visitor accepts: pending and declined visitors
      // are counted from a daily-rotating server-side hash, with nothing
      // written to their device. Needs "cookieless server hash mode" on in the
      // PostHog project (enabled 2026-11-16).
      cookieless_mode: 'on_reject',
      opt_out_capturing_by_default: true,
      loaded: function (ph) {
        // Bring PostHog's own consent state in line with the banner's choice.
        try {
          const status = ph.get_explicit_consent_status();
          if (consentGranted() && status !== 'granted') ph.opt_in_capturing({ captureEventName: false });
          if (consentDenied() && status !== 'denied') ph.opt_out_capturing();
        } catch (e) {}
        ready = true;
        // Portfolio convention (PostHog option B): one project, every property
        // registers `product` as a super property so per-product dashboards can
        // filter. Values: theaudacity | washiiba | bloop | miketineo.
        try { ph.register(Object.assign({ product: 'theaudacity' }, getFlatUtm(), priceVariant())); } catch (e) {}
        flush();
        sendPageView();
      },
    });
  }

  // ---- Consent wiring. boot() always runs; the loaded callback reconciles
  // the stored choice. A choice made after load (banner click, or the footer
  // reopening it) switches the running library between modes. Before load,
  // the loaded callback picks the choice up from localStorage.
  function setMode(granted) {
    const ph = window.posthog;
    if (!ph || !ph.__loaded) return;
    try {
      if (granted) {
        if (ph.get_explicit_consent_status() !== 'granted') ph.opt_in_capturing({ captureEventName: false });
      } else {
        ph.opt_out_capturing();
      }
    } catch (e) {}
  }

  boot();
  window.addEventListener('audacity:consent-granted', function () { setMode(true); });
  window.addEventListener('audacity:consent-denied', function () { setMode(false); });

  // ---- Event taxonomy that this layer owns directly (the rest is reported by
  // the components via window.audacityTrack): cta_clicked + outbound_click,
  // through one delegated click listener. Buffering happens inside track().
  document.addEventListener('click', function (e) {
    const cta = e.target.closest && e.target.closest('[data-cta]');
    if (cta) track('cta_clicked', { location: cta.getAttribute('data-cta') });

    const a = e.target.closest && e.target.closest('a[href]');
    if (a) {
      const raw = a.getAttribute('href') || '';
      if (/^(mailto:|tel:)/i.test(raw)) {
        track('outbound_click', { href: raw });
      } else {
        try {
          const u = new URL(a.href, location.href);
          if (/^https?:$/.test(u.protocol) && u.host && u.host !== location.host) {
            track('outbound_click', { href: u.href, host: u.host });
          }
        } catch (err) {}
      }
    }
  }, true);
})();
