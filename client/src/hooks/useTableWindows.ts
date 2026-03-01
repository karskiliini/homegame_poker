import { useState, useEffect, useCallback } from 'react';

const CHANNEL_NAME = 'ftp-table-windows';

interface TableWindowMessage {
  type: 'TABLE_OPENED' | 'TABLE_CLOSED';
  tableId: string;
}

export function openTableWindow(tableId: string) {
  window.open(`/table/${tableId}`, `table-${tableId}`);
}

export function announceTableOpen(tableId: string) {
  try {
    const ch = new BroadcastChannel(CHANNEL_NAME);
    ch.postMessage({ type: 'TABLE_OPENED', tableId } satisfies TableWindowMessage);
    ch.close();
  } catch { /* BroadcastChannel not supported */ }
}

export function announceTableClose(tableId: string) {
  try {
    const ch = new BroadcastChannel(CHANNEL_NAME);
    ch.postMessage({ type: 'TABLE_CLOSED', tableId } satisfies TableWindowMessage);
    ch.close();
  } catch { /* BroadcastChannel not supported */ }
}

/** Hook for lobby to track which tables are currently open in other windows */
export function useOpenTables() {
  const [openTables, setOpenTables] = useState<Set<string>>(new Set());

  useEffect(() => {
    let ch: BroadcastChannel;
    try {
      ch = new BroadcastChannel(CHANNEL_NAME);
      ch.onmessage = (event: MessageEvent<TableWindowMessage>) => {
        const { type, tableId } = event.data;
        setOpenTables(prev => {
          const next = new Set(prev);
          if (type === 'TABLE_OPENED') next.add(tableId);
          if (type === 'TABLE_CLOSED') next.delete(tableId);
          return next;
        });
      };
    } catch { /* BroadcastChannel not supported */ }
    return () => { try { ch?.close(); } catch {} };
  }, []);

  const isTableOpen = useCallback((tableId: string) => openTables.has(tableId), [openTables]);

  return { openTables, isTableOpen };
}
