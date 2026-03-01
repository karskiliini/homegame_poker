import express from 'express';
import cors from 'cors';
import type { Database } from './db/index.js';

export function createApp(db: Database) {
  const app = express();
  app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
  app.use(express.json());
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/bugs', (_req, res) => res.json(db.bugs.getAll()));
  app.post('/api/bugs/archive', (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.every((id: unknown) => typeof id === 'number')) {
      res.status(400).json({ error: 'ids must be an array of numbers' });
      return;
    }
    const archived = db.bugs.archive(ids);
    res.json({ archived });
  });
  return app;
}
