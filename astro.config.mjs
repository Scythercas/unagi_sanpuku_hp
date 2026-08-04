// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

// 本番の独自ドメイン（apex 運用のため base は設定しない）
const SITE_URL = 'https://sanpuku-unagi.com';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  output: 'static',

  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [sitemap()]
});
