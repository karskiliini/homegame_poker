import { defineConfig } from '@playwright/test';

const SERVER_PORT = 4951;
const CLIENT_PORT = 4952;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  workers: 1, // sequential — tests share server state
  use: {
    baseURL: `http://localhost:${CLIENT_PORT}`,
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: `PORT=${SERVER_PORT} node server/dist/index.js`,
      port: SERVER_PORT,
      reuseExistingServer: false,
      timeout: 15_000,
    },
    {
      command: `cd client && VITE_SERVER_URL=http://localhost:${SERVER_PORT} npx vite --port ${CLIENT_PORT} --strictPort`,
      port: CLIENT_PORT,
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
