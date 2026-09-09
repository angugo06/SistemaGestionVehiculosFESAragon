import { performance } from 'node:perf_hooks';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { Database } from '../server/database.ts';
import { initializeData } from '../server/seed.ts';
import { createApp } from '../server/app.ts';
import { localDate } from '../server/service.ts';

// Medición local reproducible: base aislada, sin alterar la demostración del usuario.
const db = new Database(join(mkdtempSync(join(tmpdir(), 'aragon-rendimiento-')), 'medicion.sqlite'));
initializeData(db, true);
const server = createApp(db).listen(0, '127.0.0.1');
await new Promise<void>((resolve) => server.once('listening', resolve));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
try {
  const login = await fetch(`${base}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'MovilidadAragon' },
    body: JSON.stringify({ username: 'admin', password: process.env.ADMIN_PASSWORD || 'Aragon2026!' }),
  });
  if (!login.ok) throw new Error('No se pudo iniciar la sesión para la medición.');
  const cookie = login.headers.get('set-cookie')!.split(';')[0];
  const results: {
    consulta: string;
    muestras: number;
    mediana_ms: number;
    p95_ms: number;
    maximo_ms: number;
  }[] = [];
  for (const path of [
    '/overview',
    `/movements?category=particular&from=${localDate()}`,
    '/movements',
    '/security/history',
    '/reports/movements.csv',
  ]) {
    const times: number[] = [];
    for (let i = 0; i < 30; i++) {
      const start = performance.now();
      const response = await fetch(base + path, { headers: { cookie } });
      await response.text();
      if (!response.ok) throw new Error(`Consulta fallida: ${path}`);
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    results.push({
      consulta: path,
      muestras: times.length,
      mediana_ms: Number(times[15].toFixed(2)),
      p95_ms: Number(times[28].toFixed(2)),
      maximo_ms: Number(times[29].toFixed(2)),
    });
  }
  const report = {
    fecha: new Date().toISOString(),
    node: process.version,
    plataforma: process.platform,
    movimientos: db.get<{ total: number }>('SELECT COUNT(*) total FROM movements')!.total,
    resultados: results,
    alcance:
      'Solicitudes secuenciales locales sobre datos ficticios. No es una prueba de carga institucional.',
  };
  mkdirSync('artifacts', { recursive: true });
  writeFileSync('artifacts/performance.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (results.some((result) => result.maximo_ms >= 3000)) process.exitCode = 1;
} finally {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  db.close();
}
