import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer, type AddressInfo } from 'node:net';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

async function freePort() {
  const reservation = createServer().listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => reservation.once('listening', resolve));
  const port = (reservation.address() as AddressInfo).port;
  await new Promise<void>((resolve) => reservation.close(() => resolve()));
  return port;
}

async function verifyStartup(launcher: boolean) {
  const port = await freePort();
  const database = join(mkdtempSync(join(tmpdir(), 'aragon-arranque-')), 'limpio.sqlite');
  const child = spawn(
    launcher ? 'cmd.exe' : process.execPath,
    launcher ? ['/d', '/c', 'INICIAR.cmd'] : ['--import', 'tsx', 'server/index.ts', '--dev'],
    {
      cwd: process.cwd(),
      windowsHide: true,
      env: {
        ...process.env,
        PORT: String(port),
        DB_PATH: database,
        DEMO_DATA: 'false',
        ADMIN_PASSWORD: 'InicioSeguro123!',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  let output = '';
  child.stdout.on('data', (chunk: Buffer) => {
    output += chunk.toString();
  });
  child.stderr.on('data', (chunk: Buffer) => {
    output += chunk.toString();
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    let ready = false;
    const deadline = Date.now() + 45000;
    while (Date.now() < deadline && child.exitCode === null) {
      try {
        ready = (await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(1000) })).ok;
      } catch {
        /* El servidor aún se está iniciando. */
      }
      if (ready) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(ready, `El servidor no inició: ${output}`);
    const html = await (await fetch(base)).text();
    assert.ok(html.includes('Aragón · Movilidad'));
    assert.ok(launcher ? html.includes('/assets/') : html.includes('/src/main.tsx'));
    if (!launcher) assert.equal((await fetch(`${base}/src/main.tsx`)).status, 200);
    const info = await (await fetch(`${base}/api/login-info`)).json();
    assert.equal(info.demo, false);
    const response = await fetch(`${base}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'MovilidadAragon' },
      body: JSON.stringify({ username: 'admin', password: 'InicioSeguro123!' }),
    });
    assert.equal(response.status, 200);
    const cookie = response.headers.get('set-cookie')!.split(';')[0];
    const overview = await (await fetch(`${base}/api/overview`, { headers: { cookie } })).json();
    assert.equal(overview.dashboard.inside, 0);
    assert.equal(overview.dashboard.entries, 0);
    assert.equal(overview.parkings.length, 0);
    assert.equal(overview.units.length, 0);
    assert.ok(!output.includes('is not recognized'), output);
    assert.ok(!output.includes('no se reconoce'), output);
  } finally {
    // Se detiene exclusivamente el proceso creado por esta prueba y sus descendientes.
    if (child.pid && child.exitCode === null) {
      if (process.platform === 'win32')
        spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
          windowsHide: true,
          stdio: 'ignore',
        });
      else child.kill('SIGTERM');
    }
  }
}

test('arranque de desarrollo con base vacía y contraseña inicial personalizada', { timeout: 60000 }, () =>
  verifyStartup(false),
);
test(
  'lanzador de Windows instala, compila y sirve la aplicación sin errores de comandos',
  { timeout: 60000, skip: process.platform !== 'win32' },
  () => verifyStartup(true),
);
