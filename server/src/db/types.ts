export interface PlayerRecord {
  id: string;
  name: string;
  password_hash: string;
  avatar_id: string;
  balance: number;
  created_at: string;
  last_login: string;
}

export interface SessionRecord {
  token: string;
  player_id: string;
  created_at: string;
}

export interface TransactionRecord {
  id: number;
  player_id: string;
  type: string;
  amount: number;
  table_id: string | null;
  created_at: string;
}

export interface BugReport {
  id: number;
  description: string;
  reporter_name: string;
  table_id: string | null;
  created_at: string;
}

export interface PlayerRepository {
  findByName(name: string): PlayerRecord | undefined;
  findById(id: string): PlayerRecord | undefined;
  create(name: string, password: string, avatarId?: string): Promise<PlayerRecord>;
  verifyPassword(player: PlayerRecord, password: string): Promise<boolean>;
  updateAvatar(playerId: string, avatarId: string): void;
  updateLastLogin(playerId: string): void;
}

export interface SessionRepository {
  create(playerId: string): string;
  find(token: string): SessionRecord | undefined;
  delete(token: string): void;
  deleteByPlayer(playerId: string): void;
}

export interface BalanceRepository {
  get(playerId: string): number;
  update(playerId: string, delta: number): boolean;
  set(playerId: string, balance: number): void;
  logTransaction(playerId: string, type: string, amount: number, tableId?: string): void;
  getTransactions(playerId: string, limit?: number): TransactionRecord[];
}

export interface BugRepository {
  insert(description: string, reporterName: string, tableId?: string): void;
  getAll(): BugReport[];
  archive(ids: number[]): number;
}

export interface Database {
  players: PlayerRepository;
  sessions: SessionRepository;
  balance: BalanceRepository;
  bugs: BugRepository;
}
