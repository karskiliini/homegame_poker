import type { Namespace } from 'socket.io';
import { C2S, C2S_LOBBY, S2C_PLAYER, S2C_LOBBY, STAKE_LEVELS } from '@poker/shared';
import type { TableManager } from '../game/TableManager.js';
import { insertBugReport } from '../db/bugs.js';

export function setupPlayerNamespace(nsp: Namespace, tableManager: TableManager) {
  nsp.on('connection', (socket) => {
    console.log(`Player socket connected: ${socket.id}`);

    // Start in lobby room
    socket.join('lobby');

    // Track which table this socket is at (if any)
    let currentTableId: string | null = null;

    socket.emit(S2C_PLAYER.CONNECTED, {
      stakeLevels: STAKE_LEVELS,
    });

    // Send current table list
    socket.emit(S2C_LOBBY.TABLE_LIST, tableManager.getTableList());

    // === Lobby events ===

    socket.on(C2S_LOBBY.GET_TABLES, () => {
      socket.emit(S2C_LOBBY.TABLE_LIST, tableManager.getTableList());
    });

    socket.on(C2S_LOBBY.CREATE_TABLE, (data: { stakeLevelId: string; name?: string }) => {
      const result = tableManager.createTable(data.stakeLevelId, data.name);
      if (result.error) {
        socket.emit(S2C_LOBBY.ERROR, { message: result.error });
      } else {
        tableManager.broadcastTableList();
      }
    });

    socket.on(C2S_LOBBY.JOIN_TABLE, (data: { tableId: string; name: string; buyIn: number; avatarId?: string }) => {
      const gm = tableManager.getTable(data.tableId);
      if (!gm) {
        socket.emit(S2C_LOBBY.ERROR, { message: 'Table not found' });
        return;
      }

      const result = gm.addPlayer(socket, data.name, data.buyIn, data.avatarId);
      if (result.error) {
        socket.emit(S2C_PLAYER.ERROR, { message: result.error });
      } else {
        currentTableId = data.tableId;
        // Leave lobby room, join table room (addPlayer already does socket.join)
        socket.leave('lobby');

        socket.emit(S2C_PLAYER.JOINED, { playerId: result.playerId, tableId: data.tableId });
        gm.broadcastLobbyState();
        gm.broadcastTableState();
        tableManager.broadcastTableList();
        gm.checkStartGame();
      }
    });

    socket.on(C2S_LOBBY.LEAVE_TABLE, () => {
      if (!currentTableId) return;
      const gm = tableManager.getTable(currentTableId);
      if (gm) {
        gm.leaveTable(socket.id);
        tableManager.broadcastTableList();
      }
      currentTableId = null;
      // Rejoin lobby
      socket.join('lobby');
      socket.emit(S2C_LOBBY.TABLE_LIST, tableManager.getTableList());
    });

    // === Per-table game events (only work if player is at a table) ===

    socket.on(C2S.RECONNECT, (data: { playerId: string; tableId?: string }) => {
      // Try to find which table has this player
      const targetTableId = data.tableId;
      if (!targetTableId) {
        socket.emit(S2C_PLAYER.ERROR, { message: 'Table ID required for reconnect' });
        return;
      }
      const gm = tableManager.getTable(targetTableId);
      if (!gm) {
        socket.emit(S2C_PLAYER.ERROR, { message: 'Table not found' });
        return;
      }
      const result = gm.reconnectPlayer(data.playerId, socket);
      if (result.error) {
        socket.emit(S2C_PLAYER.ERROR, { message: result.error });
      } else {
        currentTableId = targetTableId;
        socket.leave('lobby');
      }
    });

    socket.on(C2S.ACTION, (data: { action: string; amount?: number }) => {
      if (!currentTableId) return;
      const gm = tableManager.getTable(currentTableId);
      if (!gm) return;
      gm.handlePlayerAction(socket.id, data.action, data.amount);
    });

    socket.on(C2S.RIT_RESPONSE, (data: { accept: boolean; alwaysNo?: boolean }) => {
      if (!currentTableId) return;
      const gm = tableManager.getTable(currentTableId);
      if (!gm) return;
      gm.handleRitResponse(socket.id, data.accept, data.alwaysNo ?? false);
    });

    socket.on(C2S.SHOW_CARDS, (data: { show: boolean }) => {
      if (!currentTableId) return;
      const gm = tableManager.getTable(currentTableId);
      if (!gm) return;
      gm.handleShowCards(socket.id, data.show);
    });

    socket.on(C2S.GET_HISTORY, () => {
      if (!currentTableId) return;
      const gm = tableManager.getTable(currentTableId);
      if (!gm) return;
      gm.sendHandHistory(socket);
    });

    socket.on(C2S.GET_HAND, (data: { handId: string }) => {
      if (!currentTableId) return;
      const gm = tableManager.getTable(currentTableId);
      if (!gm) return;
      gm.sendHandDetail(socket, data.handId);
    });

    socket.on(C2S.REBUY, (data: { amount: number }) => {
      if (!currentTableId) return;
      const gm = tableManager.getTable(currentTableId);
      if (!gm) return;
      const result = gm.rebuyPlayer(socket.id, data.amount);
      if (result.error) {
        socket.emit(S2C_PLAYER.ERROR, { message: result.error });
      } else {
        gm.broadcastLobbyState();
        gm.broadcastTableState();
        gm.checkStartGame();
        tableManager.broadcastTableList();
      }
    });

    socket.on(C2S.SIT_OUT, () => {
      if (!currentTableId) return;
      const gm = tableManager.getTable(currentTableId);
      if (!gm) return;
      gm.handleSitOut(socket.id);
    });

    socket.on(C2S.REPORT_BUG, (data: { description: string }) => {
      if (!data.description || typeof data.description !== 'string') return;
      let name = 'Anonymous';
      if (currentTableId) {
        const gm = tableManager.getTable(currentTableId);
        if (gm) {
          name = gm.getPlayerName(socket.id) || 'Anonymous';
        }
      }
      insertBugReport(data.description, name, currentTableId ?? undefined);
      socket.emit(S2C_PLAYER.BUG_REPORTED);
    });

    socket.on('disconnect', () => {
      console.log(`Player socket disconnected: ${socket.id}`);
      if (currentTableId) {
        const gm = tableManager.getTable(currentTableId);
        if (gm) {
          gm.handlePlayerDisconnect(socket.id);
          tableManager.broadcastTableList();
        }
      }
    });
  });
}
