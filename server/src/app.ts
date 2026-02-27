import express from 'express';
import cors from 'cors';

export function createApp() {
  const app = express();
  app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  return app;
}
