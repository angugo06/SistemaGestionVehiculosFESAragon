import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { Database, hashPassword } from '../server/database.ts';
import { createApp } from '../server/app.ts';

test('API: autenticación, permisos reales, validación, concurrencia, reportes y revocación de sesiones', async () => {
  const db = new Database(':memory:');
  for (const [username, role] of [
    ['admin', 'administrador'],
    ['seguridad', 'seguridad'],
    ['direccion', 'directivo'],
  ])
    db.run(
      'INSERT INTO users(username,name,password_hash,role) VALUES(?,?,?,?)',
      username,
      username,
      hashPassword('Prueba123!'),
      role,
    );
  const server = createApp(db).listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  async function request(
    path: string,
    method = 'GET',
    body?: unknown,
    cookie = '',
    extra: Record<string, string> = {},
  ) {
    return fetch(base + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'MovilidadAragon',
        cookie,
        ...extra,
      },
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
    });
  }
  async function login(username: string) {
    const response = await request('/login', 'POST', { username, password: 'Prueba123!' });
    assert.equal(response.status, 200);
    assert.ok(response.headers.get('set-cookie')?.includes('HttpOnly'));
    return response.headers.get('set-cookie')!.split(';')[0];
  }
  try {
    assert.equal((await request('/overview')).status, 401);
    assert.equal(
      (await request('/login', 'POST', { username: 'admin', password: 'incorrecta' })).status,
      401,
    );
    const admin = await login('admin');
    const guard = await login('seguridad');
    const director = await login('direccion');
    const me = await (await request('/me', 'GET', undefined, admin)).json();
    assert.ok(!('password_hash' in me));
    assert.equal((await request('/parkings', 'POST', { name: 'Zona', capacity: 1 }, guard)).status, 403);
    assert.equal((await request('/users', 'GET', undefined, director)).status, 403);
    assert.equal(
      (
        await request('/parkings', 'POST', { name: 'Zona', capacity: 1 }, admin, {
          Origin: 'https://example.com',
        })
      ).status,
      403,
    );
    assert.equal(
      (await request('/parkings', 'POST', { name: 'Zona', capacity: 1 }, admin, { 'X-Requested-With': '' }))
        .status,
      403,
    );
    const parkingResponse = await request('/parkings', 'POST', { name: 'Zona', capacity: 1 }, admin);
    assert.equal(parkingResponse.status, 201);
    const parking = await parkingResponse.json();
    const input = {
      plate: 'API123',
      type: 'entrada',
      category: 'particular',
      parking_id: parking.id,
      access: 'Principal',
      occurred_at: '2026-01-01T12:00:00Z',
    };
    assert.equal((await request('/movements', 'POST', input, director)).status, 403);
    const competing = await Promise.all([
      request('/movements', 'POST', input, guard),
      request('/movements', 'POST', input, guard),
    ]);
    assert.deepEqual(competing.map((r) => r.status).sort(), [201, 409]);
    assert.equal((await request('/movements', 'POST', { ...input, plate: 'API456' }, guard)).status, 409);
    assert.equal((await request('/movements?from=incorrecta', 'GET', undefined, admin)).status, 400);
    assert.equal((await request('/movements', 'POST', { ...input, boarded: -1 }, guard)).status, 400);
    const report = await request(
      '/reports/movements.csv?plate=API123&category=particular',
      'GET',
      undefined,
      director,
    );
    assert.equal(report.status, 200);
    assert.ok(report.headers.get('content-disposition')?.includes('attachment'));
    const output = await report.text();
    assert.ok(output.includes('API123'));
    assert.equal(output.trim().split('\r\n').length, 2);
    const emptyReport = await request('/reports/movements.csv?plate=NOEXISTE', 'GET', undefined, director);
    assert.equal((await emptyReport.text()).trim().split('\r\n').length, 1);
    const entries = await (await request('/movements', 'GET', undefined, admin)).json();
    const exit = await request('/movements', 'POST', { ...input, type: 'salida' }, guard);
    assert.equal(exit.status, 201);
    assert.equal((await exit.json()).entry_id, entries[0].id);
    const users = (await (await request('/users', 'GET', undefined, admin)).json()) as {
      id: number;
      username: string;
    }[];
    const guardId = users.find((u) => u.username === 'seguridad')!.id;
    assert.equal(
      (
        await request(
          `/users/${guardId}`,
          'PUT',
          { username: 'seguridad', name: 'Guardia', role: 'seguridad', active: 0 },
          admin,
        )
      ).status,
      200,
    );
    assert.equal((await request('/overview', 'GET', undefined, guard)).status, 401);
    assert.equal((await request('/logout', 'POST', {}, admin)).status, 200);
    assert.equal((await request('/me', 'GET', undefined, admin)).status, 401);
    for (let i = 0; i < 15; i++)
      assert.equal(
        (await request('/login', 'POST', { username: 'noexiste', password: 'incorrecta' })).status,
        401,
      );
    assert.equal(
      (await request('/login', 'POST', { username: 'admin', password: 'Prueba123!' })).status,
      429,
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    db.close();
  }
});
