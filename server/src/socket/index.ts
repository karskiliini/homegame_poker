import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { TableManager } from '../game/TableManager.js';
import { setupPlayerNamespace } from './player-namespace.js';
import { setupTableNamespace } from './table-namespace.js';

export function createSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST'],
    },
  });

  const tableManager = new TableManager(io);

  const playerNsp = io.of('/player');
  const tableNsp = io.of('/table');

  setupPlayerNamespace(playerNsp, tableManager);
  setupTableNamespace(tableNsp, tableManager);

  return { io, tableManager };
}
