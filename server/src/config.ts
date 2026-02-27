import { Command } from 'commander';
import type { GameConfig, GameType } from '@poker/shared';
import { DEFAULT_ACTION_TIME_SECONDS, MIN_PLAYERS, MAX_PLAYERS } from '@poker/shared';

export function parseConfig(): GameConfig & { port: number } {
  const program = new Command();

  program
    .option('--small-blind <number>', 'Small blind amount', '1')
    .option('--big-blind <number>', 'Big blind amount', '2')
    .option('--max-buy-in <number>', 'Maximum buy-in amount', '200')
    .option('--game <type>', 'Game type: nlhe or plo', 'nlhe')
    .option('--action-time <seconds>', 'Action time limit in seconds', String(DEFAULT_ACTION_TIME_SECONDS))
    .option('--port <number>', 'Server port', '3000')
    .parse();

  const opts = program.opts();

  const rawGameType = process.env.GAME_TYPE || opts.game || 'nlhe';
  const gameType: GameType = rawGameType.toLowerCase() === 'plo' ? 'PLO' : 'NLHE';

  return {
    gameType,
    smallBlind: parseInt(process.env.SMALL_BLIND || opts.smallBlind, 10),
    bigBlind: parseInt(process.env.BIG_BLIND || opts.bigBlind, 10),
    maxBuyIn: parseInt(process.env.MAX_BUY_IN || opts.maxBuyIn, 10),
    actionTimeSeconds: parseInt(process.env.ACTION_TIME || opts.actionTime, 10),
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
    port: parseInt(process.env.PORT || opts.port, 10),
  };
}
