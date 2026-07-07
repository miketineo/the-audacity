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

export const ATTR_KEY = 'audacity-attribution';

const PARAM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
];

/** Pull the recognised marketing params off the current URL. */
export function readParams() {
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
export function captureAttribution() {
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
export function getAttribution() {
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
export function getFlatUtm() {
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
