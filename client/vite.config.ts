import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import mkcert from 'vite-plugin-mkcert';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('../package.json', 'utf-8'));

export default defineConfig({
  plugins: [react(), tailwindcss(), mkcert()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
