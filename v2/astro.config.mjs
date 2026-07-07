// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// The Audacity v2. Static output. PROMOTED TO ROOT (Stage C, 2026-07-07): serves at
// theaudacity.io/. v1 is archived under /v1/. See the v2 revamp spec §7.3 / §12.
export default defineConfig({
  site: 'https://theaudacity.io',
  base: '/',
  trailingSlash: 'always',
  output: 'static',
  build: {
    format: 'directory',
  },
  integrations: [
    sitemap(),
  ],
});
