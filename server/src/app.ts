import express from 'express';
import cors from 'cors';
import { setAnimDelays, getAnimConfig, resetAnimDelays } from '@poker/shared';
import type { Database } from './db/index.js';

export function createApp(db: Database) {
  const app = express();
  app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
  app.use(express.json());
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/animation-config', (_req, res) => res.json(getAnimConfig()));
  app.post('/api/animation-config', (req, res) => {
    setAnimDelays(req.body);
    res.json(getAnimConfig());
  });
  app.post('/api/animation-config/reset', (_req, res) => {
    resetAnimDelays();
    res.json(getAnimConfig());
  });

  // Layout positions — stored in DB, synced to source code via CLI skill
  app.get('/api/layout-positions', (_req, res) => {
    const data = db.layout.getPositions();
    res.json(data ?? { error: 'no positions saved yet' });
  });
  app.post('/api/layout-positions', (req, res) => {
    db.layout.savePositions(req.body);
    res.json({ ok: true });
  });

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
