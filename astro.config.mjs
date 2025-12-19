// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  image: {
    responsive: true,
  },

  output: 'hybrid', 

  adapter: cloudflare(),
});