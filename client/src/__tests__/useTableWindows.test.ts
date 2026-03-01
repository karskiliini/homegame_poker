// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('table window coordination', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('openTableWindow calls window.open with correct args', async () => {
    const mockOpen = vi.fn().mockReturnValue({});
    vi.stubGlobal('open', mockOpen);

    const { openTableWindow } = await import('../hooks/useTableWindows.js');
    openTableWindow('abc-123');
    expect(mockOpen).toHaveBeenCalledWith('/table/abc-123', 'table-abc-123');
  });

  it('announceTableOpen posts TABLE_OPENED message via BroadcastChannel', async () => {
    const mockPostMessage = vi.fn();
    const mockClose = vi.fn();
    vi.stubGlobal('BroadcastChannel', vi.fn(() => ({
      postMessage: mockPostMessage,
      close: mockClose,
    })));

    const { announceTableOpen } = await import('../hooks/useTableWindows.js');
    announceTableOpen('table-1');

    expect(mockPostMessage).toHaveBeenCalledWith({
      type: 'TABLE_OPENED',
      tableId: 'table-1',
    });
    expect(mockClose).toHaveBeenCalled();
  });

  it('announceTableClose posts TABLE_CLOSED message via BroadcastChannel', async () => {
    const mockPostMessage = vi.fn();
    const mockClose = vi.fn();
    vi.stubGlobal('BroadcastChannel', vi.fn(() => ({
      postMessage: mockPostMessage,
      close: mockClose,
    })));

    const { announceTableClose } = await import('../hooks/useTableWindows.js');
    announceTableClose('table-2');

    expect(mockPostMessage).toHaveBeenCalledWith({
      type: 'TABLE_CLOSED',
      tableId: 'table-2',
    });
    expect(mockClose).toHaveBeenCalled();
  });

  it('announce functions do not throw when BroadcastChannel is unavailable', async () => {
    vi.stubGlobal('BroadcastChannel', undefined);

    const { announceTableOpen, announceTableClose } = await import('../hooks/useTableWindows.js');

    expect(() => announceTableOpen('x')).not.toThrow();
    expect(() => announceTableClose('x')).not.toThrow();
  });
});
