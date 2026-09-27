import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://eyurivilc.github.io',
  base: '/Binarix',
  vite: { plugins: [tailwindcss()] },
});
