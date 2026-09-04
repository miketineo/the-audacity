/**
 * posthog-setup.js — the canonical PostHog loader for every Audacity web
 * surface (theaudacity.io, miketineo.com, washiiba).
 *
 * This file is BYTE-IDENTICAL everywhere. Each site vendors a copy and CI
 * asserts its sha256 against posthog-setup.js.sha256, so a per-site edit fails
 * the build. Edit the canonical copy in the-audacity/website and re-run
 * scripts/sync-analytics.sh; never edit a vendored copy.
 *
 * Everything that differs per site lives next to it in posthog-config.js, which
 * must be loaded FIRST and which sets window.__PH_CONFIG plus the 4-line stub
 * queue:
 *
 *   window.__PH_CONFIG = { key, product, release_id, consent: { ... } };
 *   window.phTrack    = function(){ (window.__PH_Q = window.__PH_Q || []).push(['capture'].concat([].slice.call(arguments))); };
 *   window.phRegister = function(p){ (window.__PH_Q = window.__PH_Q || []).push(['register', p]); };
 *   window.phConsent  = function(g){ (window.__PH_Q = window.__PH_Q || []).push(['consent', g]); };
 *
 * The stub removes every load-order assumption: page code can call phTrack()
 * before this file has parsed, before consent, and before PostHog has loaded.
 * On execution this module overwrites the three globals and drains __PH_Q.
 *
 * Nothing leaves the browser before consent is granted. The queue is in-memory
 * and dies with the page, so buffering pre-consent events is GDPR-safe.
 *
 * No bundler, no modules, no build step: this is loaded as a plain <script src>
 * because two of the three sites have nothing that could process it.
 *
 * Contract and per-site install: shared/analytics/README.md.
 */
(function (w, d) {
  'use strict';

  // Retirement flag for theaudacity.io's hand-rolled `page_view`, kept alive
  // alongside `$pageview` for one soak cycle. At retirement, flip this to false
  // AND delete the guarded emit in loaded() below, in the same commit: the CI
  // guard rejects a custom page_view capture whenever the flag is not true, so
  // reintroduction fails the build.
  var LEGACY_PAGEVIEW = true;

  // The proxy is primary because beating adblockers is its whole point. The
  // fallback means a VPS outage costs adblocker-resistance rather than total
  // silent death. Do not build retry/timeout machinery beyond this.
  var ASSET_URL = 'https://z.miketineo.com/static/array.js';
  var ASSET_FALLBACK_URL = 'https://eu-assets.i.posthog.com/static/array.js';

  var DEFAULTS = {
    api_host: 'https://z.miketineo.com',
    ui_host: 'https://eu.posthog.com',
    defaults: '2026-05-30',
    person_profiles: 'identified_only',
    persistence: 'localStorage+cookie'
  };

  // Exact match, never suffix match: a suffix match on miketineo.com re-admits
  // bear-draft.miketineo.com, which is precisely the leak being closed. So
  // washiiba.miketineo.com is enumerated explicitly rather than inherited.
  var PROD = {
    'theaudacity.io': 1, 'www.theaudacity.io': 1,
    'miketineo.com': 1, 'www.miketineo.com': 1,
    'washiiba.com': 1, 'www.washiiba.com': 1, 'washiiba.miketineo.com': 1
  };

  function envFor(h) {
    if (PROD[h] === 1) return 'production';
    if (h === 'localhost' || h === '127.0.0.1' || /\.local\.test$/.test(h)) return 'local';
    return 'preview'; // *.pages.dev, bear-draft.miketineo.com, anything unrecognised
  }

  var cfg = w.__PH_CONFIG || {};
  var env = envFor(w.location.hostname);

  var forced = false;
  try { forced = w.localStorage.getItem('ph-debug') === '1'; } catch (e) {}

  // Skip init entirely off production rather than tagging env:'preview'. At this
  // traffic volume preview hits are Miguel and his agents — a majority of the
  // dataset, not a rounding error — and tagging only helps if every future query
  // remembers to filter. Set localStorage ph-debug=1 to force it on.
  if (env !== 'production' && !forced) {
    w.phTrack = w.phRegister = w.phConsent = function () {};
    w.__PH_Q = [];
    return;
  }

  // A broken stamp should be visible rather than confusing.
  var releaseId = /^__RELEASE/.test(cfg.release_id) ? 'unstamped' : cfg.release_id;

  var booted = false;  // snippet injected + init() called
  var ready = false;   // loaded callback fired
  var granted = null;  // true | false | null (undecided)
  var queue = [];      // ['capture', event, props] | ['register', props]

  function flush() {
    while (queue.length) {
      var entry = queue.shift();
      try {
        if (entry[0] === 'register') w.posthog.register(entry[1]);
        else w.posthog.capture(entry[1], entry[2]);
      } catch (e) {}
    }
  }

  // Held until consent is granted AND PostHog has loaded, then replayed in order.
  function pump() {
    if (granted !== true) return;
    if (!booted) boot();
    if (ready) flush();
  }

  function track(event, props) { queue.push(['capture', event, props]); pump(); }
  function register(props) { queue.push(['register', props]); pump(); }

  function consent(g) {
    granted = !!g;
    if (granted) { pump(); return; }
    queue.length = 0;
    try { w.posthog && w.posthog.opt_out_capturing && w.posthog.opt_out_capturing(); } catch (e) {}
  }

  function boot() {
    if (booted) return;
    booted = true;
    loadSnippet();

    // Site overrides merge first, then these three are FORCED. The CI guard
    // asserts these exact three lines. Do not make them configurable.
    var opts = Object.assign({}, DEFAULTS, cfg.init || {});
    opts.autocapture = true;
    opts.capture_pageview = true;
    opts.capture_pageleave = true;

    opts.loaded = function (ph) {
      ready = true;
      // Dual-register for one cycle: saved insights filter on `app`, new ones
      // use `product`. Same value in both, so no dashboard breaks on ship day.
      // Drop `app` once no saved insight references it.
      try {
        ph.register({ product: cfg.product, app: cfg.product, env: env, release_id: releaseId });
      } catch (e) {}
      if (LEGACY_PAGEVIEW && cfg.legacy_page_view) {
        try { ph.capture('page_view', { path: w.location.pathname }); } catch (e) {}
      }
      flush();
    };

    w.posthog.init(cfg.key, opts);
  }

  // Official PostHog array snippet, with two deliberate edits: the library URL
  // is hardcoded (the upstream `.i.posthog.com` → `-assets.i.posthog.com`
  // replace is a no-op against a proxy host) and an onerror fallback is added.
  function loadSnippet() {
    !(function (t, e) {
      var o, n, p, r;
      e.__SV || ((w.posthog = e), (e._i = []), (e.init = function (i, s, a) {
        function g(t, e) {
          var o = e.split('.');
          2 == o.length && ((t = t[o[0]]), (e = o[1])),
            (t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); });
        }
        ((p = t.createElement('script')).type = 'text/javascript'),
          (p.crossOrigin = 'anonymous'),
          (p.async = !0),
          (p.src = ASSET_URL),
          (p.onerror = function () {
            var f = t.createElement('script');
            f.async = !0;
            f.crossOrigin = 'anonymous';
            f.src = ASSET_FALLBACK_URL;
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
    })(d, w.posthog || []);
  }

  // ---- Replace the stub, then drain whatever it collected. Order matters: the
  // stored choice is read first so a queued phConsent() call still wins.
  w.phTrack = track;
  w.phRegister = register;
  w.phConsent = consent;

  try {
    var stored = cfg.consent && cfg.consent.read ? cfg.consent.read() : null;
    granted = stored === true ? true : (stored === false ? false : null);
  } catch (e) { granted = null; }

  // Sites that signal by CustomEvent name them in the config; sites that signal
  // by direct call use window.phConsent(true) from their banner. Each site uses
  // one path, both are supported.
  if (cfg.consent && cfg.consent.grantEvent) {
    w.addEventListener(cfg.consent.grantEvent, function () { consent(true); });
  }
  if (cfg.consent && cfg.consent.denyEvent) {
    w.addEventListener(cfg.consent.denyEvent, function () { consent(false); });
  }

  var pending = w.__PH_Q || [];
  w.__PH_Q = [];
  for (var i = 0; i < pending.length; i++) {
    var entry = pending[i];
    if (entry[0] === 'consent') consent(entry[1]);
    else if (entry[0] === 'register') register(entry[1]);
    else track(entry[1], entry[2]);
  }

  pump();
})(window, document);
