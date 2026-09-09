import { Database, hashPassword } from './database.ts';
import { MobilityService, localDate } from './service.ts';
import type { User } from '../shared/types.ts';

export function initializeData(db: Database, demo = true) {
  if (db.get('SELECT 1 FROM users LIMIT 1')) return;
  const password = process.env.ADMIN_PASSWORD || (demo ? 'Aragon2026!' : '');
  if (password.length < 8)
    throw new Error(
      'Define ADMIN_PASSWORD con al menos 8 caracteres para iniciar sin datos de demostración.',
    );
  const service = new MobilityService(db);
  db.run('INSERT INTO metadata(key,value) VALUES(?,?)', 'demo', demo ? '1' : '0');
  db.run(
    'INSERT INTO users(username,name,password_hash,role) VALUES(?,?,?,?)',
    'admin',
    'Administración',
    hashPassword(password),
    'administrador',
  );
  const admin = db.get<User>('SELECT id,username,name,role,active FROM users WHERE username=?', 'admin')!;
  if (!demo) return;
  db.run(
    'INSERT INTO users(username,name,password_hash,role) VALUES(?,?,?,?)',
    'seguridad',
    'Seguridad escolar',
    hashPassword('Aragon2026!'),
    'seguridad',
  );
  db.run(
    'INSERT INTO users(username,name,password_hash,role) VALUES(?,?,?,?)',
    'direccion',
    'Dirección académica',
    hashPassword('Aragon2026!'),
    'directivo',
  );
  const parkings = [
    service.saveParking(admin, null, { name: 'Estacionamiento principal', capacity: 120 }),
    service.saveParking(admin, null, { name: 'Zona de profesores', capacity: 60 }),
    service.saveParking(admin, null, { name: 'Estacionamiento norte', capacity: 80 }),
  ];
  const bus1 = service.saveUnit(admin, null, {
    code: 'PUMABÚS 01',
    plate: 'UNAM101',
    category: 'transporte',
    route: 'Metro Nezahualcóyotl · FES Aragón',
    capacity: 40,
  });
  const bus2 = service.saveUnit(admin, null, {
    code: 'PUMABÚS 02',
    plate: 'UNAM102',
    category: 'transporte',
    route: 'Metro Impulsora · FES Aragón',
    capacity: 40,
  });
  const bus3 = service.saveUnit(admin, null, {
    code: 'ENLACE 03',
    plate: 'UNAM103',
    category: 'transporte',
    route: 'Metro Río de los Remedios · FES Aragón',
    capacity: 28,
  });
  const patrols = ['01', '02', '03', '04'].map((code, index) =>
    service.saveUnit(admin, null, {
      code: `ÁGUILA ${code}`,
      plate: `FES20${index + 1}`,
      category: 'seguridad',
      route: ['Circuito principal', 'Acceso norte', 'Zona deportiva', 'Taller'][index],
    }),
  );
  const today = localDate();
  const todayStart = Date.parse(`${today}T00:00:00-06:00`);
  const now = Date.now();
  // Escenario reproducible de siete días; las matrículas y rutas son ficticias.
  for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
    const dayStart = todayStart - daysAgo * 86400000;
    for (let i = 0; i < 32; i++) {
      const arrival = dayStart + (7 * 60 + i * 16) * 60000;
      const departure = arrival + (120 + (i % 5) * 37) * 60000;
      if (departure >= now) continue;
      const common = {
        plate: `DEMO${String(i + 1).padStart(3, '0')}`,
        category: 'particular',
        parking_id: parkings[i % 3].id,
        access: i % 2 ? 'Acceso norte' : 'Acceso principal',
      };
      service.registerMovement(admin, {
        ...common,
        type: 'entrada',
        occurred_at: new Date(arrival).toISOString(),
      });
      service.registerMovement(admin, {
        ...common,
        type: 'salida',
        occurred_at: new Date(departure).toISOString(),
      });
    }
    for (const [i, bus] of [bus1, bus2, bus3].entries()) {
      for (let trip = 0; trip < 3; trip++) {
        const arrival = dayStart + (8 * 60 + trip * 180 + i * 25) * 60000;
        if (arrival + 20 * 60000 >= now) continue;
        service.registerMovement(admin, {
          plate: bus.plate,
          category: 'transporte',
          unit_id: bus.id,
          type: 'entrada',
          access: 'Acceso transporte',
          occurred_at: new Date(arrival).toISOString(),
          alighted: 18 + i * 4 + trip,
        });
        service.registerMovement(admin, {
          plate: bus.plate,
          category: 'transporte',
          unit_id: bus.id,
          type: 'salida',
          access: 'Acceso transporte',
          occurred_at: new Date(arrival + 20 * 60000).toISOString(),
          boarded: 12 + i * 3 + trip,
        });
      }
    }
  }
  for (let i = 0; i < 43; i++) {
    service.registerMovement(admin, {
      plate: `FIC${String(i + 100)}`,
      category: 'particular',
      type: 'entrada',
      parking_id: parkings[i % 3].id,
      access: i % 2 ? 'Acceso norte' : 'Acceso principal',
      occurred_at: new Date(now - (44 - i) * 120000).toISOString(),
    });
  }
  for (const [i, unit] of patrols.entries()) {
    service.registerMovement(admin, {
      plate: unit.plate,
      category: 'seguridad',
      type: 'entrada',
      unit_id: unit.id,
      access: 'Acceso principal',
      occurred_at: new Date(now - 120000).toISOString(),
    });
    service.changeStatus(admin, unit.id, {
      status: ['en_ronda', 'en_ronda', 'incidente', 'mantenimiento'][i],
      note: [
        'Recorrido preventivo en circuito principal.',
        'Supervisión de acceso norte.',
        'Apoyo por vehículo averiado. Sin personas lesionadas.',
        'Revisión preventiva programada.',
      ][i],
    });
  }
}
