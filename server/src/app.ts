import express from 'express';
import cors from 'cors';
import { getAllBugReports } from './db/bugs.js';

export function createApp() {
  const app = express();
  app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/bugs', (_req, res) => res.json(getAllBugReports()));
  return app;
}
