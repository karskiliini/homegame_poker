import type { Namespace } from 'socket.io';
import { S2C_TABLE } from '@poker/shared';
import type { GameManager } from '../game/GameManager.js';

export function setupTableNamespace(nsp: Namespace, gameManager: GameManager) {
  nsp.on('connection', (socket) => {
    console.log(`Table display connected: ${socket.id}`);

    // Send full game state on connect
    socket.emit(S2C_TABLE.GAME_STATE, gameManager.getTableState());
  });
}
