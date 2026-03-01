const TABLE_SESSION_PREFIX = 'ftp-session-';

export interface TableSession {
  playerId: string;
  playerToken: string;
  tableId: string;
  playerName: string;
  playerAvatar: string;
}

export function saveTableSession(tableId: string, session: TableSession) {
  try { localStorage.setItem(`${TABLE_SESSION_PREFIX}${tableId}`, JSON.stringify(session)); } catch { /* noop */ }
}

export function loadTableSession(tableId: string): TableSession | null {
  try {
    const raw = localStorage.getItem(`${TABLE_SESSION_PREFIX}${tableId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.playerId && parsed.playerToken && parsed.tableId) return parsed;
    return null;
  } catch { return null; }
}

export function clearTableSession(tableId: string) {
  try { localStorage.removeItem(`${TABLE_SESSION_PREFIX}${tableId}`); } catch { /* noop */ }
}
