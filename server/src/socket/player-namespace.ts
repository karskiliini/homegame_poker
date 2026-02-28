import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import type { Namespace } from 'socket.io';
import { C2S, C2S_LOBBY, S2C_PLAYER, S2C_LOBBY, STAKE_LEVELS } from '@poker/shared';
import type { TableManager } from '../game/TableManager.js';
import { insertBugReport } from '../db/bugs.js';
import {
  findPlayerByName, createPlayer, verifyPassword,
  getPlayerBalance, updateBalance, updateLastLogin, updateAvatar,
} from '../db/players.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf-8'));
const SERVER_VERSION: string = pkg.version;

export function setupPlayerNamespace(nsp: Namespace, tableManager: TableManager) {
  nsp.on('connection', (socket) => {
    console.log(`Player socket connected: ${socket.id}`);

    // Start in lobby room
    socket.join('lobby');

    // Track which table this socket is at (if any)
    let currentTableId: string | null = null;

    // Auth state per socket
    let authenticatedPlayerId: string | null = null;
    let authenticatedPlayerName: string | null = null;

    socket.emit(S2C_PLAYER.CONNECTED, {
      stakeLevels: STAKE_LEVELS,
      serverVersion: SERVER_VERSION,
    });

    // Send current table list
    socket.emit(S2C_LOBBY.TABLE_LIST, tableManager.getTableList());

    // === Auth events ===

    socket.on(C2S_LOBBY.CHECK_NAME, (data: { name: string }) => {
      if (!data.name || typeof data.name !== 'string') return;
      const player = findPlayerByName(data.name.trim());
      socket.emit(S2C_LOBBY.NAME_STATUS, { exists: !!player });
    });

    socket.on(C2S_LOBBY.REGISTER, async (data: { name: string; password: string; avatarId?: string }) => {
      if (!data.name || !data.password) {
        socket.emit(S2C_LOBBY.AUTH_ERROR, { message: 'Name and password required' });
        return;
      }
      const name = data.name.trim();
      if (!name) {
        socket.emit(S2C_LOBBY.AUTH_ERROR, { message: 'Name is required' });
        return;
      }
      if (data.password.length < 1) {
        socket.emit(S2C_LOBBY.AUTH_ERROR, { message: 'Password is required' });
        return;
      }
      const existing = findPlayerByName(name);
      if (existing) {
        socket.emit(S2C_LOBBY.AUTH_ERROR, { message: 'Name already taken' });
        return;
      }
      try {
        const player = await createPlayer(name, data.password, data.avatarId || '1');
        authenticatedPlayerId = player.id;
        authenticatedPlayerName = player.name;
        socket.emit(S2C_LOBBY.AUTH_SUCCESS, {
          playerId: player.id,
          name: player.name,
          avatarId: player.avatar_id,
          balance: player.balance,
        });
      } catch (err) {
        socket.emit(S2C_LOBBY.AUTH_ERROR, { message: 'Registration failed' });
      }
    });

    socket.on(C2S_LOBBY.LOGIN, async (data: { name: string; password: string }) => {
      if (!data.name || !data.password) {
        socket.emit(S2C_LOBBY.AUTH_ERROR, { message: 'Name and password required' });
        return;
      }
      const player = findPlayerByName(data.name.trim());
      if (!player) {
        socket.emit(S2C_LOBBY.AUTH_ERROR, { message: 'Player not found' });
        return;
      }
      const valid = await verifyPassword(player, data.password);
      if (!valid) {
        socket.emit(S2C_LOBBY.AUTH_ERROR, { message: 'Wrong password' });
        return;
      }
      updateLastLogin(player.id);
      authenticatedPlayerId = player.id;
      authenticatedPlayerName = player.name;
      socket.emit(S2C_LOBBY.AUTH_SUCCESS, {
        playerId: player.id,
        name: player.name,
        avatarId: player.avatar_id,
        balance: player.balance,
      });
    });

    socket.on(C2S_LOBBY.DEPOSIT, (data: { amount: number }) => {
      if (!authenticatedPlayerId) {
        socket.emit(S2C_LOBBY.AUTH_ERROR, { message: 'Not authenticated' });
        return;
      }
      if (!data.amount || data.amount <= 0) {
        socket.emit(S2C_LOBBY.ERROR, { message: 'Invalid amount' });
        return;
      }
      const ok = updateBalance(authenticatedPlayerId, data.amount);
      if (ok) {
        const balance = getPlayerBalance(authenticatedPlayerId);
        socket.emit(S2C_LOBBY.BALANCE_UPDATE, { balance });
      } else {
        socket.emit(S2C_LOBBY.ERROR, { message: 'Deposit failed' });
      }
    });

    // === Lobby events ===

    socket.on(C2S_LOBBY.GET_TABLES, () => {
      socket.emit(S2C_LOBBY.TABLE_LIST, tableManager.getTableList());
    });

    socket.on(C2S_LOBBY.CREATE_TABLE, (data: { stakeLevelId: string; name?: string }, callback?: (response: { tableId: string }) => void) => {
      const result = tableManager.createTable(data.stakeLevelId, data.name);
      if (result.error) {
        socket.emit(S2C_LOBBY.ERROR, { message: result.error });
      } else {
        if (typeof callback === 'function') {
          callback({ tableId: result.tableId! });
        }
        socket.emit(S2C_LOBBY.TABLE_CREATED, { tableId: result.tableId });
        tableManager.broadcastTableList();
      }
    });

    socket.on(C2S_LOBBY.JOIN_TABLE, (data: { tableId: string; name: string; buyIn: number; avatarId?: string; seatIndex?: number }) => {
      const gm = tableManager.getTable(data.tableId);
      if (!gm) {
        socket.emit(S2C_LOBBY.ERROR, { message: 'Table not found' });
        return;
      }

      // If authenticated, check and deduct balance
      if (authenticatedPlayerId) {
        const balance = getPlayerBalance(authenticatedPlayerId);
        if (balance < data.buyIn) {
          socket.emit(S2C_PLAYER.ERROR, { message: 'Insufficient balance' });
          return;
        }
      }

      const result = gm.addPlayer(socket, data.name, data.buyIn, data.avatarId, data.seatIndex, authenticatedPlayerId || undefined);
      if (result.error) {
        socket.emit(S2C_PLAYER.ERROR, { message: result.error });
      } else {
        // Deduct balance on successful join
        if (authenticatedPlayerId) {
          updateBalance(authenticatedPlayerId, -data.buyIn);
          const balance = getPlayerBalance(authenticatedPlayerId);
          socket.emit(S2C_LOBBY.BALANCE_UPDATE, { balance });
        }

        // Set up per-player callback to credit balance back when removed
        if (authenticatedPlayerId && result.playerId) {
          const pid = authenticatedPlayerId;
          gm.setOnPlayerRemoved(result.playerId, (removedPlayerId, remainingStack) => {
            if (remainingStack > 0) {
              updateBalance(pid, remainingStack);
              const balance = getPlayerBalance(pid);
              socket.emit(S2C_LOBBY.BALANCE_UPDATE, { balance });
            }
          });
        }

        currentTableId = data.tableId;
        // Leave lobby room, join table room (addPlayer already does socket.join)
        socket.leave('lobby');

        socket.emit(S2C_PLAYER.JOINED, { playerId: result.playerId, playerToken: result.playerToken, tableId: data.tableId });
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
        // Balance credit happens via onPlayerRemoved callback
        gm.leaveTable(socket.id);
        tableManager.broadcastTableList();
      }
      currentTableId = null;
      // Rejoin lobby
      socket.join('lobby');
      socket.emit(S2C_LOBBY.TABLE_LIST, tableManager.getTableList());
    });

    // === Per-table game events (only work if player is at a table) ===

    socket.on(C2S.RECONNECT, (data: { playerId: string; tableId?: string; playerToken?: string }) => {
      // Try to find which table has this player
      const targetTableId = data.tableId;
      if (!targetTableId) {
        socket.emit(S2C_PLAYER.RECONNECT_FAILED, { message: 'Table ID required for reconnect' });
        return;
      }
      const gm = tableManager.getTable(targetTableId);
      if (!gm) {
        socket.emit(S2C_PLAYER.RECONNECT_FAILED, { message: 'Table not found' });
        return;
      }
      const result = gm.reconnectPlayer(data.playerId, socket, data.playerToken);
      if (result.error) {
        socket.emit(S2C_PLAYER.RECONNECT_FAILED, { message: result.error });
      } else {
        currentTableId = targetTableId;
        socket.leave('lobby');
        // Restore auth state from persistent player ID
        const player = findPlayerByName('');  // We need to find by ID
        // Try to restore auth from the player's persistent ID
        // The playerId from reconnect might be a persistent DB ID
        authenticatedPlayerId = data.playerId;
        socket.emit(S2C_PLAYER.RECONNECTED, { playerId: data.playerId, tableId: targetTableId });
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

      // If authenticated, check and deduct balance
      if (authenticatedPlayerId) {
        const balance = getPlayerBalance(authenticatedPlayerId);
        if (balance < data.amount) {
          socket.emit(S2C_PLAYER.ERROR, { message: 'Insufficient balance' });
          return;
        }
      }

      const result = gm.rebuyPlayer(socket.id, data.amount);
      if (result.error) {
        socket.emit(S2C_PLAYER.ERROR, { message: result.error });
      } else {
        // Deduct balance on successful rebuy
        if (authenticatedPlayerId) {
          updateBalance(authenticatedPlayerId, -data.amount);
          const balance = getPlayerBalance(authenticatedPlayerId);
          socket.emit(S2C_LOBBY.BALANCE_UPDATE, { balance });
        }

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

    socket.on(C2S.SIT_OUT_NEXT_HAND, () => {
      if (!currentTableId) return;
      const gm = tableManager.getTable(currentTableId);
      if (!gm) return;
      gm.handleSitOutNextHand(socket.id);
    });

    socket.on(C2S.AUTO_MUCK, () => {
      if (!currentTableId) return;
      const gm = tableManager.getTable(currentTableId);
      if (!gm) return;
      gm.handleAutoMuck(socket.id);
    });

    socket.on(C2S.SIT_IN, () => {
      if (!currentTableId) return;
      const gm = tableManager.getTable(currentTableId);
      if (!gm) return;
      gm.handleSitIn(socket.id);
      gm.checkStartGame();
    });

    socket.on(C2S.UPDATE_AVATAR, (data: { avatarId: string }) => {
      if (!currentTableId) return;
      const gm = tableManager.getTable(currentTableId);
      if (!gm) return;
      gm.updatePlayerAvatar(socket.id, data.avatarId);
      // Also update in DB if authenticated
      if (authenticatedPlayerId) {
        updateAvatar(authenticatedPlayerId, data.avatarId);
      }
    });

    socket.on(C2S.CHAT, (data: { message: string }) => {
      if (!currentTableId) return;
      const gm = tableManager.getTable(currentTableId);
      if (!gm) return;
      gm.handleChatMessage(socket.id, data.message);
    });

    socket.on(C2S.CHIP_TRICK, () => {
      if (!currentTableId) return;
      const gm = tableManager.getTable(currentTableId);
      if (!gm) return;
      gm.handleChipTrick(socket.id);
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
