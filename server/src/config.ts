import { Command } from 'commander';

export function parseConfig(): { port: number } {
  const program = new Command();

  program
    .option('--port <number>', 'Server port', '3000')
    .parse();

  const opts = program.opts();

  return {
    port: parseInt(process.env.PORT || opts.port, 10),
  };
}
