import { createServer } from 'http';
import { createApp } from './app.js';
import { createSocketServer } from './socket/index.js';
import { parseConfig } from './config.js';

const configWithPort = parseConfig();
const { port, ...config } = configWithPort;

const app = createApp();
const httpServer = createServer(app);
const { gameManager } = createSocketServer(httpServer, config);

httpServer.listen(port, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║          POKER HOME GAME SERVER              ║
╠══════════════════════════════════════════════╣
║  Game:       ${config.gameType.padEnd(30)}║
║  Blinds:     ${(config.smallBlind + '/' + config.bigBlind).padEnd(30)}║
║  Max Buy-in: ${String(config.maxBuyIn).padEnd(30)}║
║  Port:       ${String(port).padEnd(30)}║
╠══════════════════════════════════════════════╣
║  Table view: http://localhost:${port}/table${' '.repeat(Math.max(0, 9 - String(port).length))}║
║  Player URL: http://localhost:${port}/${' '.repeat(Math.max(0, 14 - String(port).length))}║
╚══════════════════════════════════════════════╝
  `);
});
