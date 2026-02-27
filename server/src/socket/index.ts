import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import type { GameConfig } from '@poker/shared';
import { S2C_TABLE } from '@poker/shared';
import { GameManager } from '../game/GameManager.js';
import { setupPlayerNamespace } from './player-namespace.js';
import { setupTableNamespace } from './table-namespace.js';

export function createSocketServer(httpServer: HttpServer, config: GameConfig) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST'],
    },
  });

  const gameManager = new GameManager(config, io);

  const playerNsp = io.of('/player');
  const tableNsp = io.of('/table');

  setupPlayerNamespace(playerNsp, gameManager);
  setupTableNamespace(tableNsp, gameManager);

  return { io, gameManager };
}
