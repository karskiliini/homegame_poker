import type { Namespace } from 'socket.io';
import { C2S, S2C_PLAYER } from '@poker/shared';
import type { GameManager } from '../game/GameManager.js';

export function setupPlayerNamespace(nsp: Namespace, gameManager: GameManager) {
  nsp.on('connection', (socket) => {
    console.log(`Player socket connected: ${socket.id}`);

    socket.emit(S2C_PLAYER.CONNECTED, {
      config: gameManager.getConfig(),
    });

    socket.on(C2S.JOIN, (data: { name: string; buyIn: number; avatarId?: string }) => {
      const result = gameManager.addPlayer(socket, data.name, data.buyIn, data.avatarId);
      if (result.error) {
        socket.emit(S2C_PLAYER.ERROR, { message: result.error });
      } else {
        gameManager.broadcastLobbyState();
        gameManager.broadcastTableState();
      }
    });

    socket.on(C2S.READY, () => {
      gameManager.setPlayerReady(socket.id);
      gameManager.broadcastLobbyState();
      gameManager.checkStartGame();
    });

    socket.on(C2S.ACTION, (data: { action: string; amount?: number }) => {
      gameManager.handlePlayerAction(socket.id, data.action, data.amount);
    });

    socket.on(C2S.RIT_RESPONSE, (data: { accept: boolean; alwaysNo?: boolean }) => {
      gameManager.handleRitResponse(socket.id, data.accept, data.alwaysNo ?? false);
    });

    socket.on(C2S.SHOW_CARDS, (data: { show: boolean }) => {
      gameManager.handleShowCards(socket.id, data.show);
    });

    socket.on(C2S.GET_HISTORY, () => {
      gameManager.sendHandHistory(socket);
    });

    socket.on(C2S.GET_HAND, (data: { handId: string }) => {
      gameManager.sendHandDetail(socket, data.handId);
    });

    socket.on(C2S.REBUY, (data: { amount: number }) => {
      const result = gameManager.rebuyPlayer(socket.id, data.amount);
      if (result.error) {
        socket.emit(S2C_PLAYER.ERROR, { message: result.error });
      } else {
        gameManager.broadcastLobbyState();
        gameManager.broadcastTableState();
      }
    });

    socket.on('disconnect', () => {
      console.log(`Player socket disconnected: ${socket.id}`);
      gameManager.handlePlayerDisconnect(socket.id);
    });
  });
}
