import { createServer } from 'http';
import { createApp } from './app.js';
import { createSocketServer } from './socket/index.js';
import { parseConfig } from './config.js';

const { port } = parseConfig();

const app = createApp();
const httpServer = createServer(app);
const { tableManager } = createSocketServer(httpServer);

httpServer.listen(port, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║          POKER HOME GAME SERVER              ║
╠══════════════════════════════════════════════╣
║  Multi-table lobby enabled                   ║
║  Port:       ${String(port).padEnd(30)}║
╠══════════════════════════════════════════════╣
║  Table view: http://localhost:${port}/table${' '.repeat(Math.max(0, 9 - String(port).length))}║
║  Player URL: http://localhost:${port}/${' '.repeat(Math.max(0, 14 - String(port).length))}║
╚══════════════════════════════════════════════╝
  `);
});
