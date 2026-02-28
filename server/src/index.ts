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
║  URL: http://localhost:${port}/${' '.repeat(Math.max(0, 21 - String(port).length))}║
╚══════════════════════════════════════════════╝
  `);
});
