import { v4 as uuidv4 } from 'uuid';
import type { Server } from 'socket.io';
import type { GameConfig } from '@poker/shared';
import { STAKE_LEVELS, getStakeLevelById, stakeLevelToGameConfig, S2C_LOBBY } from '@poker/shared';
import type { StakeLevel, TableInfo } from '@poker/shared';
import { GameManager } from './GameManager.js';

interface TableEntry {
  gameManager: GameManager;
  stakeLevel: StakeLevel;
  name: string;
  tableId: string;
}

export class TableManager {
  private tables: Map<string, TableEntry> = new Map();
  private io: Server;
  private tableCounter = 0;

  constructor(io: Server) {
    this.io = io;
  }

  createTable(stakeLevelId: string, name?: string): { tableId?: string; error?: string } {
    const stakeLevel = getStakeLevelById(stakeLevelId);
    if (!stakeLevel) return { error: 'Unknown stake level: ' + stakeLevelId };

    const tableId = uuidv4().slice(0, 8);
    this.tableCounter++;
    const tableName = name || 'Table ' + this.tableCounter;
    const config: GameConfig = stakeLevelToGameConfig(stakeLevel);

    const gameManager = new GameManager(config, this.io, tableId, () => {
      this.handleTableEmpty(tableId);
    });

    this.tables.set(tableId, { gameManager, stakeLevel, name: tableName, tableId });
    console.log('Table created: ' + tableName + ' (' + stakeLevel.label + ') [' + tableId + ']');
    return { tableId };
  }

  getTable(tableId: string): GameManager | undefined {
    return this.tables.get(tableId)?.gameManager;
  }

  getTableEntry(tableId: string): TableEntry | undefined {
    return this.tables.get(tableId);
  }

  removeTable(tableId: string) {
    const entry = this.tables.get(tableId);
    if (entry) {
      console.log('Table removed: ' + entry.name + ' [' + tableId + ']');
      this.tables.delete(tableId);
    }
  }

  private handleTableEmpty(tableId: string) {
    this.removeTable(tableId);
    this.broadcastTableList();
  }

  getTableList(): TableInfo[] {
    return [...this.tables.values()].map(entry => ({
      tableId: entry.tableId,
      name: entry.name,
      stakeLevel: entry.stakeLevel,
      playerCount: entry.gameManager.getPlayerCount(),
      maxPlayers: entry.gameManager.getConfig().maxPlayers,
      players: entry.gameManager.getPlayerInfoList(),
      phase: entry.gameManager.getPhase(),
    }));
  }

  broadcastTableList() {
    const tableList = this.getTableList();
    this.io.of('/player').to('lobby').emit(S2C_LOBBY.TABLE_LIST, tableList);
    this.io.of('/table').to('lobby').emit(S2C_LOBBY.TABLE_LIST, tableList);
  }

  getStakeLevels() { return STAKE_LEVELS; }
  getAllTableIds(): string[] { return [...this.tables.keys()]; }
}
