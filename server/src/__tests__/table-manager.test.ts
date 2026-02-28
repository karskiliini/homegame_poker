import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TableManager } from '../game/TableManager.js';
import { STAKE_LEVELS, S2C_LOBBY } from '@poker/shared';

function createMockSocket(id: string) {
  return {
    id,
    emit: vi.fn(),
    on: vi.fn(),
    join: vi.fn(),
  } as any;
}

function createMockIo() {
  const emitFn = vi.fn();
  const toFn = vi.fn().mockReturnValue({ emit: emitFn });
  const namespaceObj = { emit: emitFn, to: toFn };
  return {
    of: vi.fn().mockReturnValue(namespaceObj),
    _emitFn: emitFn,
    _toFn: toFn,
  } as any;
}

describe('TableManager', () => {
  let tm: TableManager;
  let io: ReturnType<typeof createMockIo>;

  beforeEach(() => {
    io = createMockIo();
    tm = new TableManager(io);
  });

  it('creates a table with valid stake level', () => {
    const result = tm.createTable('nlhe-1-2');
    expect(result.error).toBeUndefined();
    expect(result.tableId).toBeDefined();
    expect(result.tableId!.length).toBe(8);
  });

  it('returns error for unknown stake level', () => {
    const result = tm.createTable('invalid-level');
    expect(result.error).toContain('Unknown stake level');
    expect(result.tableId).toBeUndefined();
  });

  it('getTable returns GameManager for existing table', () => {
    const { tableId } = tm.createTable('nlhe-1-2');
    const gm = tm.getTable(tableId!);
    expect(gm).toBeDefined();
    expect(gm!.getTableId()).toBe(tableId);
  });

  it('getTable returns undefined for non-existent table', () => {
    expect(tm.getTable('non-existent')).toBeUndefined();
  });

  it('getTableList returns info about all tables', () => {
    tm.createTable('nlhe-1-2');
    tm.createTable('nlhe-2-5');

    const list = tm.getTableList();
    expect(list).toHaveLength(2);

    const stakeIds = list.map(t => t.stakeLevel.id);
    expect(stakeIds).toContain('nlhe-1-2');
    expect(stakeIds).toContain('nlhe-2-5');

    for (const table of list) {
      expect(table.tableId).toBeDefined();
      expect(table.name).toBeDefined();
      expect(table.playerCount).toBe(0);
      expect(table.maxPlayers).toBe(10);
      expect(table.players).toEqual([]);
      expect(table.phase).toBe('waiting_for_players');
    }
  });

  it('assigns sequential table names', () => {
    tm.createTable('nlhe-1-2');
    tm.createTable('nlhe-1-2');

    const list = tm.getTableList();
    expect(list[0].name).toBe('Table 1');
    expect(list[1].name).toBe('Table 2');
  });

  it('uses custom name when provided', () => {
    tm.createTable('nlhe-1-2', 'My Custom Table');
    const list = tm.getTableList();
    expect(list[0].name).toBe('My Custom Table');
  });

  it('removeTable removes a table', () => {
    const { tableId } = tm.createTable('nlhe-1-2');
    expect(tm.getTableList()).toHaveLength(1);

    tm.removeTable(tableId!);
    expect(tm.getTableList()).toHaveLength(0);
    expect(tm.getTable(tableId!)).toBeUndefined();
  });

  it('removeTable is no-op for non-existent table', () => {
    tm.createTable('nlhe-1-2');
    tm.removeTable('non-existent');
    expect(tm.getTableList()).toHaveLength(1);
  });

  it('broadcastTableList emits to both player and table lobby rooms', () => {
    tm.createTable('nlhe-1-2');
    tm.broadcastTableList();

    // io.of should be called with '/player' and '/table'
    const ofCalls = io.of.mock.calls.map((c: any[]) => c[0]);
    expect(ofCalls).toContain('/player');
    expect(ofCalls).toContain('/table');

    // .to('lobby') should be called
    expect(io._toFn).toHaveBeenCalledWith('lobby');

    // emit should contain TABLE_LIST event
    const tableListEmits = io._emitFn.mock.calls.filter(
      (c: any[]) => c[0] === S2C_LOBBY.TABLE_LIST
    );
    expect(tableListEmits.length).toBeGreaterThanOrEqual(1);
    expect(tableListEmits[0][1]).toHaveLength(1);
  });

  it('table reflects player count after joining', () => {
    const { tableId } = tm.createTable('nlhe-1-2');
    const gm = tm.getTable(tableId!)!;

    const sock = createMockSocket('sock-1');
    gm.addPlayer(sock, 'Alice', 200);

    const list = tm.getTableList();
    expect(list[0].playerCount).toBe(1);
    expect(list[0].players).toHaveLength(1);
    expect(list[0].players[0].name).toBe('Alice');
  });

  it('getAllTableIds returns all table IDs', () => {
    const r1 = tm.createTable('nlhe-1-2');
    const r2 = tm.createTable('nlhe-2-5');

    const ids = tm.getAllTableIds();
    expect(ids).toHaveLength(2);
    expect(ids).toContain(r1.tableId);
    expect(ids).toContain(r2.tableId);
  });

  it('getStakeLevels returns all stake levels', () => {
    expect(tm.getStakeLevels()).toBe(STAKE_LEVELS);
  });

  it('stake level config is correctly applied to GameManager', () => {
    const { tableId } = tm.createTable('nlhe-2-5');
    const gm = tm.getTable(tableId!)!;
    const config = gm.getConfig();

    expect(config.smallBlind).toBe(2);
    expect(config.bigBlind).toBe(5);
    expect(config.maxBuyIn).toBe(500);
    expect(config.gameType).toBe('NLHE');
  });
});
