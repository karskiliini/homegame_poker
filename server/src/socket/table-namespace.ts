import type { Namespace } from 'socket.io';
import { S2C_TABLE, S2C_LOBBY, C2S_TABLE, C2S, S2C_PLAYER } from '@poker/shared';
import type { TableManager } from '../game/TableManager.js';
import { insertBugReport } from '../db/bugs.js';

export function setupTableNamespace(nsp: Namespace, tableManager: TableManager) {
  nsp.on('connection', (socket) => {
    console.log(`Table display connected: ${socket.id}`);

    // Start in lobby room
    socket.join('lobby');

    let currentTableId: string | null = null;

    // Send table list
    socket.emit(S2C_LOBBY.TABLE_LIST, tableManager.getTableList());

    // Watch a specific table
    socket.on(C2S_TABLE.WATCH, (data: { tableId: string }) => {
      const gm = tableManager.getTable(data.tableId);
      if (!gm) return;

      // Leave lobby and any previous table room
      socket.leave('lobby');
      if (currentTableId) {
        socket.leave(`table:${currentTableId}`);
      }

      currentTableId = data.tableId;
      socket.join(gm.getRoomId());

      // Send current game state
      socket.emit(S2C_TABLE.GAME_STATE, gm.getTableState());
    });

    // Stop watching
    socket.on(C2S_TABLE.UNWATCH, () => {
      if (currentTableId) {
        socket.leave(`table:${currentTableId}`);
        currentTableId = null;
      }
      socket.join('lobby');
      socket.emit(S2C_LOBBY.TABLE_LIST, tableManager.getTableList());
    });

    // Hand history from table view
    socket.on(C2S_TABLE.GET_HISTORY, () => {
      if (!currentTableId) return;
      const gm = tableManager.getTable(currentTableId);
      if (!gm) return;
      gm.sendTableHandHistory(socket);
    });

    socket.on(C2S_TABLE.GET_HAND, (data: { handId: string }) => {
      if (!currentTableId) return;
      const gm = tableManager.getTable(currentTableId);
      if (!gm) return;
      gm.sendTableHandDetail(socket, data.handId);
    });

    socket.on(C2S.REPORT_BUG, (data: { description: string }) => {
      if (!data.description || typeof data.description !== 'string') return;
      insertBugReport(data.description, 'Spectator', currentTableId ?? undefined);
      socket.emit(S2C_PLAYER.BUG_REPORTED);
    });
  });
}
