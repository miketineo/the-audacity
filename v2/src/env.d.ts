/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  /** PostHog project API key (phc_…). Public client key, set at build time. */
  readonly PUBLIC_POSTHOG_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  audacityTrack?: (event: string, props?: Record<string, unknown>) => void;
  posthog?: any;
}
