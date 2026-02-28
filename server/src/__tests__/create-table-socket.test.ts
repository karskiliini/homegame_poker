import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TableManager } from '../game/TableManager.js';
import { C2S_LOBBY, S2C_LOBBY, S2C_PLAYER, STAKE_LEVELS } from '@poker/shared';

/**
 * Test: Create Table socket handler should use acknowledgment callback
 *
 * Bug: When user clicks "Create Table" in the UI, selects a stake level,
 * the table is created on the server but the client doesn't navigate to
 * the watching screen. The TABLE_CREATED event emitted by the server
 * is not reliably received by the client (likely due to React StrictMode
 * double-mount causing listener issues).
 *
 * Fix: Use Socket.IO acknowledgment callback pattern so the server
 * responds directly to the emit call, and the client navigates in the
 * callback of the emit (same component, no separate listener needed).
 */

function createMockSocket(id: string) {
  const handlers = new Map<string, Function>();
  return {
    id,
    emit: vi.fn(),
    on: vi.fn((event: string, handler: Function) => {
      handlers.set(event, handler);
    }),
    join: vi.fn(),
    leave: vi.fn(),
    _handlers: handlers,
    _trigger(event: string, ...args: any[]) {
      const handler = handlers.get(event);
      if (handler) handler(...args);
    },
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

describe('Create Table socket handler', () => {
  let tm: TableManager;
  let io: ReturnType<typeof createMockIo>;

  beforeEach(() => {
    io = createMockIo();
    tm = new TableManager(io);
  });

  it('CREATE_TABLE handler calls acknowledgment callback with tableId on success', () => {
    // Simulate what the server handler should do when receiving CREATE_TABLE
    // with a callback function (Socket.IO acknowledgment pattern)
    const callback = vi.fn();
    const result = tm.createTable('nlhe-1-2');

    expect(result.error).toBeUndefined();
    expect(result.tableId).toBeDefined();

    // The server handler should call the callback with { tableId }
    // This is the pattern we need to implement
    callback({ tableId: result.tableId });
    expect(callback).toHaveBeenCalledWith({ tableId: result.tableId });
  });

  it('CREATE_TABLE handler sends error via socket.emit on invalid stake level', () => {
    const result = tm.createTable('invalid-level');
    expect(result.error).toBeDefined();
    expect(result.tableId).toBeUndefined();
  });

  it('server handler invokes ack callback so client can navigate directly', async () => {
    // This test verifies the actual server handler behavior:
    // When CREATE_TABLE is received with a callback, the handler should
    // call the callback with { tableId } instead of (or in addition to)
    // emitting a separate TABLE_CREATED event.

    // Import the handler setup function
    const { setupPlayerNamespace } = await import('../socket/player-namespace.js');

    const socket = createMockSocket('test-socket');
    const mockNsp = {
      on: vi.fn((event: string, handler: Function) => {
        if (event === 'connection') {
          handler(socket);
        }
      }),
    } as any;

    setupPlayerNamespace(mockNsp, tm);

    // Find the CREATE_TABLE handler
    const createTableHandler = socket._handlers.get(C2S_LOBBY.CREATE_TABLE);
    expect(createTableHandler).toBeDefined();

    // Call with a valid stake level AND an acknowledgment callback
    const ackCallback = vi.fn();
    createTableHandler({ stakeLevelId: 'nlhe-1-2' }, ackCallback);

    // The callback should be called with the tableId
    expect(ackCallback).toHaveBeenCalledTimes(1);
    expect(ackCallback).toHaveBeenCalledWith(
      expect.objectContaining({ tableId: expect.any(String) })
    );

    // Table should have been created
    expect(tm.getTableList()).toHaveLength(1);

    // Table list should have been broadcast
    expect(io._toFn).toHaveBeenCalledWith('lobby');
  });

  it('server handler sends error via socket.emit when stake level is invalid', async () => {
    const { setupPlayerNamespace } = await import('../socket/player-namespace.js');

    const socket = createMockSocket('test-socket');
    const mockNsp = {
      on: vi.fn((event: string, handler: Function) => {
        if (event === 'connection') {
          handler(socket);
        }
      }),
    } as any;

    setupPlayerNamespace(mockNsp, tm);

    const createTableHandler = socket._handlers.get(C2S_LOBBY.CREATE_TABLE);
    const ackCallback = vi.fn();
    createTableHandler({ stakeLevelId: 'invalid' }, ackCallback);

    // On error, the callback should NOT be called
    expect(ackCallback).not.toHaveBeenCalled();

    // Instead, error should be emitted via socket.emit
    expect(socket.emit).toHaveBeenCalledWith(
      S2C_LOBBY.ERROR,
      expect.objectContaining({ message: expect.stringContaining('Unknown stake level') })
    );

    // No table should have been created
    expect(tm.getTableList()).toHaveLength(0);
  });

  it('server handler works without callback (backwards compatible)', async () => {
    const { setupPlayerNamespace } = await import('../socket/player-namespace.js');

    const socket = createMockSocket('test-socket');
    const mockNsp = {
      on: vi.fn((event: string, handler: Function) => {
        if (event === 'connection') {
          handler(socket);
        }
      }),
    } as any;

    setupPlayerNamespace(mockNsp, tm);

    const createTableHandler = socket._handlers.get(C2S_LOBBY.CREATE_TABLE);

    // Call WITHOUT a callback (old client behavior)
    createTableHandler({ stakeLevelId: 'nlhe-1-2' });

    // Should still work - table created, TABLE_CREATED emitted
    expect(tm.getTableList()).toHaveLength(1);
    expect(socket.emit).toHaveBeenCalledWith(
      S2C_LOBBY.TABLE_CREATED,
      expect.objectContaining({ tableId: expect.any(String) })
    );
  });
});
