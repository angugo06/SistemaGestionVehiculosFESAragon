import { backup, DatabaseSync } from 'node:sqlite';
import { mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const source = resolve(process.env.DB_PATH || 'data/aragon.sqlite');
if (!existsSync(source))
  throw new Error('No existe la base de datos. Inicia la aplicación antes de generar un respaldo.');
mkdirSync('backups', { recursive: true });
const destination = resolve(`backups/aragon-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`);
const db = new DatabaseSync(source, { readOnly: true });
try {
  await backup(db, destination);
  console.log(`Respaldo guardado en ${destination}`);
} finally {
  db.close();
}
