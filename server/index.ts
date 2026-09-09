import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import express from 'express';
import { Database } from './database.ts';
import { initializeData } from './seed.ts';
import { createApp } from './app.ts';

const dev = process.argv.includes('--dev');
const port = Number(process.env.PORT || 3000);
const db = new Database(resolve(process.env.DB_PATH || 'data/aragon.sqlite'));
initializeData(db, process.env.DEMO_DATA !== 'false');
const app = createApp(db);
if (dev) {
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
} else {
  if (!existsSync('dist/index.html')) {
    console.error('Primero ejecuta pnpm build, o utiliza pnpm dev para desarrollar.');
    db.close();
    process.exit(1);
  }
  app.use(express.static(resolve('dist')));
  app.get('/{*path}', (_req, res) => res.sendFile(resolve('dist/index.html')));
}
const server = app.listen(port, '127.0.0.1', () => {
  console.log(
    `\n  ARAGÓN · MOVILIDAD\n  Abre http://localhost:${port}\n  Base de datos: ${resolve(process.env.DB_PATH || 'data/aragon.sqlite')}\n  Presiona Ctrl+C para detener.\n`,
  );
});
server.on('error', (error: NodeJS.ErrnoException) => {
  console.error(
    error.code === 'EADDRINUSE'
      ? `El puerto ${port} está ocupado. Cierra la otra instancia o define PORT.`
      : 'No se pudo iniciar el servidor local.',
  );
  db.close();
  process.exit(1);
});
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () =>
    server.close(() => {
      db.close();
      process.exit(0);
    }),
  );
