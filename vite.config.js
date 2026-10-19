import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { readdirSync, existsSync } from 'node:fs';

const root = import.meta.dirname;

// Every generated region page is an extra HTML entry (regions/<slug>/index.html)
const regionInputs = existsSync(resolve(root, 'regions'))
  ? Object.fromEntries(
      readdirSync(resolve(root, 'regions'), { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => [`region-${d.name}`, resolve(root, 'regions', d.name, 'index.html')])
    )
  : {};

// In dev there are no prerendered /es/, /ar/… folders — serve the same page and let the runtime switch language.
const langRewrite = () => ({
  name: 'proj-c-lang-rewrite',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const m = req.url && req.url.match(/^\/(es|ar|zh|ja)(\/.*|\?.*)?$/);
      if (m) {
        let rest = m[2] || '/';
        if (rest.startsWith('?')) rest = '/' + rest;
        req.url = rest;
      }
      next();
    });
  },
});

export default defineConfig({
  plugins: [langRewrite()],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      input: { main: resolve(root, 'index.html'), ...regionInputs },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three/')) return 'three';
          if (id.includes('node_modules/gsap/')) return 'gsap';
          if (id.includes('world-atlas') || id.includes('topojson')) return 'geo';
        },
      },
    },
  },
  server: { host: true },
});
