import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { TableManager } from '../game/TableManager.js';
import { setupPlayerNamespace } from './player-namespace.js';
import { setupTableNamespace } from './table-namespace.js';
import type { Database } from '../db/index.js';

export function createSocketServer(httpServer: HttpServer, db: Database) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST'],
    },
  });

  const tableManager = new TableManager(io);

  const playerNsp = io.of('/player');
  const tableNsp = io.of('/table');

  setupPlayerNamespace(playerNsp, tableManager, db);
  setupTableNamespace(tableNsp, tableManager, db);

  return { io, tableManager };
}
