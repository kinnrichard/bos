import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://kit.svelte.dev/docs/integrations#preprocessors
  // for more information about preprocessors
  preprocess: vitePreprocess(),

  // Disable accessibility warnings during early development
  // TODO: Re-enable these warnings before production deployment
  onwarn: (warning, handler) => {
    // Ignore all accessibility warnings for now
    if (warning.code.startsWith('a11y-')) {
      return;
    }
    // Handle all other warnings normally
    handler(warning);
  },

  kit: {
    adapter: adapter({
      // pages: directory to write prerendered pages to
      pages: 'build',
      // assets: directory to write static assets to
      assets: 'build',
      // fallback: SPA mode fallback page
      fallback: 'index.html',
      // precompress: enables precompressing using gzip and brotli
      precompress: false,
      // strict: fail the build if any pages can't be prerendered
      strict: false
    }),
    alias: {
      $components: 'src/components',
      $stores: 'src/stores',
      $api: 'src/lib/api',
      $utils: 'src/lib/utils',
      $types: 'src/types',
    },
  },
};

export default config;
