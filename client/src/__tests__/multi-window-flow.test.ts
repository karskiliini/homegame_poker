// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { openTableWindow } from '../hooks/useTableWindows.js';

describe('multi-window table flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('openTableWindow opens correct URL with window name', () => {
    const mockOpen = vi.fn().mockReturnValue({});
    vi.stubGlobal('open', mockOpen);

    openTableWindow('test-table-id');

    expect(mockOpen).toHaveBeenCalledWith(
      '/table/test-table-id',
      'table-test-table-id'
    );
  });

  it('opening same table twice reuses window name', () => {
    const mockWindow = {};
    const mockOpen = vi.fn().mockReturnValue(mockWindow);
    vi.stubGlobal('open', mockOpen);

    openTableWindow('same-table');
    openTableWindow('same-table');

    // Both calls use same window name, browser reuses window
    expect(mockOpen).toHaveBeenCalledTimes(2);
    expect(mockOpen).toHaveBeenNthCalledWith(1, '/table/same-table', 'table-same-table');
    expect(mockOpen).toHaveBeenNthCalledWith(2, '/table/same-table', 'table-same-table');
  });

  it('different tables open different windows', () => {
    const mockOpen = vi.fn().mockReturnValue({});
    vi.stubGlobal('open', mockOpen);

    openTableWindow('table-1');
    openTableWindow('table-2');

    expect(mockOpen).toHaveBeenNthCalledWith(1, '/table/table-1', 'table-table-1');
    expect(mockOpen).toHaveBeenNthCalledWith(2, '/table/table-2', 'table-table-2');
  });
});
