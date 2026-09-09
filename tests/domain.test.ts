import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Database, hashPassword, verifyPassword } from '../server/database.ts';
import { MobilityService } from '../server/service.ts';
import { csv } from '../server/app.ts';
import type { User } from '../shared/types.ts';

function fixture(path = ':memory:') {
  const db = new Database(path);
  db.run(
    "INSERT INTO users(username,name,password_hash,role) VALUES('admin','Administración',?,'administrador')",
    hashPassword('Prueba123!'),
  );
  const admin = db.get<User>('SELECT * FROM users WHERE id=1')!;
  const service = new MobilityService(db);
  const parking = service.saveParking(admin, null, { name: 'Zona de prueba', capacity: 2 });
  const input = {
    plate: 'ABC123',
    category: 'particular',
    type: 'entrada',
    parking_id: parking.id,
    access: 'Principal',
    occurred_at: '2026-01-10T14:00:00.000Z',
  };
  return { db, admin, service, parking, input };
}

test('CA-01/02/03: una entrada ocupa un lugar y su salida lo libera, con enlace y bitácora', () => {
  const f = fixture();
  try {
    const entry = f.service.registerMovement(f.admin, f.input);
    assert.equal(f.service.parkings()[0].occupied, 1);
    assert.equal(f.service.dashboard({}).inside, 1);
    const exit = f.service.registerMovement(f.admin, {
      ...f.input,
      type: 'salida',
      occurred_at: '2026-01-10T15:00:00.000Z',
    });
    assert.equal(exit.entry_id, entry.id);
    assert.equal(f.service.movement(entry.id).exit_at, exit.occurred_at);
    assert.equal(f.service.parkings()[0].occupied, 0);
    assert.equal(f.service.dashboard({}).entries, 1);
    assert.equal(f.service.dashboard({}).exits, 1);
    assert.equal(f.service.auditLog(f.admin, {}).length, 3);
  } finally {
    f.db.close();
  }
});

test('rechaza duplicados normalizados, exceso de capacidad y salidas sin entrada; no deja escrituras parciales', () => {
  const f = fixture();
  try {
    f.service.registerMovement(f.admin, f.input);
    assert.throws(
      () => f.service.registerMovement(f.admin, { ...f.input, plate: 'abc-123' }),
      /ya está dentro/,
    );
    f.service.registerMovement(f.admin, { ...f.input, plate: 'DEF456' });
    assert.throws(() => f.service.registerMovement(f.admin, { ...f.input, plate: 'GHI789' }), /lleno/);
    assert.throws(
      () => f.service.registerMovement(f.admin, { ...f.input, plate: 'JKL123', type: 'salida' }),
      /entrada abierta/,
    );
    assert.equal(f.service.movements({}).length, 2);
    assert.equal(f.service.parkings()[0].occupied, 2);
  } finally {
    f.db.close();
  }
});

test('valida el orden temporal, la categoría de salida y la ausencia de fechas futuras', () => {
  const f = fixture();
  try {
    f.service.registerMovement(f.admin, f.input);
    assert.throws(
      () =>
        f.service.registerMovement(f.admin, {
          ...f.input,
          type: 'salida',
          occurred_at: '2026-01-09T14:00:00Z',
        }),
      /último movimiento/,
    );
    assert.throws(
      () => f.service.registerMovement(f.admin, { ...f.input, type: 'salida', category: 'seguridad' }),
      /categoría/,
    );
    assert.throws(
      () => f.service.registerMovement(f.admin, { ...f.input, occurred_at: '2999-01-01T14:00:00Z' }),
      /futuros/,
    );
  } finally {
    f.db.close();
  }
});

test('CA-04: conserva los estados anteriores, responsable y observaciones de seguridad', () => {
  const f = fixture();
  try {
    const unit = f.service.saveUnit(f.admin, null, {
      code: 'ÁGUILA',
      plate: 'SEG123',
      category: 'seguridad',
    });
    f.service.changeStatus(f.admin, unit.id, { status: 'en_ronda', note: 'Recorrido preventivo' });
    f.service.changeStatus(f.admin, unit.id, { status: 'incidente', note: 'Apoyo vial' });
    const history = f.service.history({ unit: String(unit.id) });
    assert.equal(history.length, 3);
    assert.equal(history[0].previous_status, 'en_ronda');
    assert.equal(history[0].status, 'incidente');
    assert.equal(history[0].username, 'Administración');
    assert.equal(f.service.units()[0].status, 'incidente');
    assert.throws(() => f.service.changeStatus(f.admin, unit.id, { status: 'incidente' }), /ya tiene/);
    assert.equal(f.service.history({ status: 'en_ronda' }).length, 1);
  } finally {
    f.db.close();
  }
});

test('CA-05: suma los conteos de transporte y rechaza negativos, fracciones y unidades incorrectas', () => {
  const f = fixture();
  try {
    const unit = f.service.saveUnit(f.admin, null, {
      code: 'BUS 01',
      plate: 'BUS123',
      category: 'transporte',
    });
    const input = {
      ...f.input,
      plate: unit.plate,
      category: 'transporte',
      parking_id: null,
      unit_id: unit.id,
      alighted: 20,
      boarded: 0,
    };
    assert.throws(() => f.service.registerMovement(f.admin, { ...input, boarded: -1 }));
    assert.throws(() => f.service.registerMovement(f.admin, { ...input, alighted: 1.5 }));
    assert.throws(() => f.service.registerMovement(f.admin, { ...input, plate: 'WRONG1' }), /catálogo/);
    assert.throws(() => f.service.registerMovement(f.admin, { ...f.input, plate: unit.plate }), /catálogo/);
    f.service.registerMovement(f.admin, input);
    f.service.registerMovement(f.admin, { ...input, type: 'salida', alighted: 0, boarded: 15 });
    const dashboard = f.service.dashboard({ from: '2026-01-10', to: '2026-01-10' });
    assert.equal(dashboard.boarded, 15);
    assert.equal(dashboard.alighted, 20);
    assert.equal(f.service.parkings()[0].occupied, 0);
  } finally {
    f.db.close();
  }
});

test('CA-06: filtra por fecha del campus, horario, placa, categoría, tipo y estacionamiento', () => {
  const f = fixture();
  try {
    f.service.registerMovement(f.admin, { ...f.input, occurred_at: '2026-01-11T05:59:00Z' });
    f.service.registerMovement(f.admin, { ...f.input, type: 'salida', occurred_at: '2026-01-11T06:00:00Z' });
    const rows = f.service.movements({
      from: '2026-01-10',
      to: '2026-01-10',
      timeFrom: '23:00',
      timeTo: '23:59',
      plate: 'abc-1',
      category: 'particular',
      type: 'entrada',
      parking: String(f.parking.id),
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].type, 'entrada');
    assert.equal(f.service.movements({ from: '2026-01-11', to: '2026-01-11' }).length, 1);
    assert.equal(f.service.movements({ plate: '%' }).length, 0);
    assert.equal(f.service.movements({ timeFrom: '09:00', timeTo: '10:00' }).length, 0);
    assert.throws(() => f.service.movements({ from: '2026-02-01', to: '2026-01-01' }));
    assert.throws(() => f.service.movements({ from: '2026-02-30' }));
    assert.throws(() => f.service.movements({ timeFrom: '25:00' }));
  } finally {
    f.db.close();
  }
});

test('CA-07: directivo solo consulta y seguridad no modifica catálogos ni usuarios', () => {
  const f = fixture();
  try {
    const directivo: User = { ...f.admin, role: 'directivo' };
    const seguridad: User = { ...f.admin, role: 'seguridad' };
    assert.throws(() => f.service.registerMovement(directivo, f.input), /consulta/);
    assert.throws(() => f.service.changeStatus(directivo, 1, { status: 'en_ronda' }), /consulta/);
    assert.throws(() => f.service.saveParking(seguridad, null, { name: 'X', capacity: 5 }), /administrador/);
    assert.throws(() => f.service.saveUnit(seguridad, null, {}), /administrador/);
    assert.throws(() => f.service.saveUser(seguridad, null, {}), /administrador/);
    assert.throws(() => f.service.auditLog(seguridad, {}), /administrador/);
    assert.doesNotThrow(() => f.service.registerMovement(seguridad, f.input));
  } finally {
    f.db.close();
  }
});

test('protege la ocupación al editar catálogos y conserva al último administrador', () => {
  const f = fixture();
  try {
    f.service.registerMovement(f.admin, f.input);
    f.service.registerMovement(f.admin, { ...f.input, plate: 'DEF456' });
    assert.throws(
      () => f.service.saveParking(f.admin, f.parking.id, { name: 'Zona', capacity: 1 }),
      /ocupación/,
    );
    assert.throws(
      () => f.service.saveParking(f.admin, f.parking.id, { name: 'Zona', capacity: 2, active: 0 }),
      /salidas/,
    );
    assert.throws(
      () => f.service.saveUser(f.admin, f.admin.id, { username: 'admin', name: 'Admin', role: 'directivo' }),
      /administrador activo/,
    );
    assert.throws(
      () => f.service.saveUser(f.admin, null, { username: 'new', name: 'Nuevo', role: 'seguridad' }),
      /contraseña/,
    );
    const unit = f.service.saveUnit(f.admin, null, { code: 'SEG', plate: 'SEG456', category: 'seguridad' });
    f.service.registerMovement(f.admin, {
      ...f.input,
      plate: unit.plate,
      category: 'seguridad',
      unit_id: unit.id,
      parking_id: null,
    });
    assert.throws(
      () =>
        f.service.saveUnit(f.admin, unit.id, {
          code: unit.code,
          plate: unit.plate,
          category: unit.category,
          active: 0,
        }),
      /debe salir/,
    );
    assert.throws(
      () =>
        f.service.saveUnit(f.admin, unit.id, { code: unit.code, plate: unit.plate, category: 'transporte' }),
      /categoría/,
    );
  } finally {
    f.db.close();
  }
});

test('los hashes usan sal distinta, las contraseñas no aparecen en bitácora y el CSV neutraliza fórmulas', () => {
  const a = hashPassword('Password123!');
  const b = hashPassword('Password123!');
  assert.notEqual(a, b);
  assert.ok(verifyPassword('Password123!', a));
  assert.ok(!verifyPassword('incorrecta', a));
  assert.ok(!a.includes('Password123!'));
  const f = fixture();
  try {
    f.service.saveUser(f.admin, null, {
      username: 'test',
      name: 'Prueba',
      role: 'seguridad',
      password: 'Sensible123!',
    });
    assert.ok(!JSON.stringify(f.service.auditLog(f.admin, {})).includes('Sensible123!'));
    const output = csv([['=1+1', ' @SUM(A1)', 'texto,"ok"', 'ñ']]);
    assert.ok(output.startsWith('\uFEFF"\'=1+1"'));
    assert.ok(output.includes("' @SUM"));
    assert.ok(output.includes('texto,""ok""'));
  } finally {
    f.db.close();
  }
});

test('RNF-05: movimientos, ocupación y usuarios sobreviven al cierre y reapertura de SQLite', () => {
  const path = join(mkdtempSync(join(tmpdir(), 'aragon-persistencia-')), 'prueba.sqlite');
  const f = fixture(path);
  f.service.registerMovement(f.admin, f.input);
  f.db.close();
  const reopened = new Database(path);
  try {
    const service = new MobilityService(reopened);
    assert.equal(service.parkings()[0].occupied, 1);
    assert.equal(service.movements({}).length, 1);
    assert.ok(reopened.get('SELECT id FROM users WHERE username=?', 'admin'));
  } finally {
    reopened.close();
  }
});
