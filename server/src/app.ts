import express from 'express';
import cors from 'cors';
import { getAllBugReports, archiveBugReports } from './db/bugs.js';

export function createApp() {
  const app = express();
  app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
  app.use(express.json());
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/bugs', (_req, res) => res.json(getAllBugReports()));
  app.post('/api/bugs/archive', (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.every((id: unknown) => typeof id === 'number')) {
      res.status(400).json({ error: 'ids must be an array of numbers' });
      return;
    }
    const archived = archiveBugReports(ids);
    res.json({ archived });
  });
  return app;
}
