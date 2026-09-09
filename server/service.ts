import type { SQLInputValue } from 'node:sqlite';
import { Database, hashPassword } from './database.ts';
import {
  filterSchema,
  movementSchema,
  parkingSchema,
  unitSchema,
  userSchema,
  statusChangeSchema,
} from './validation.ts';
import type { Audit, Dashboard, Filters, History, Movement, Parking, Unit, User } from '../shared/types.ts';

export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const localDate = (value = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
export const localTime = (value: string) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Mexico_City',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value));
const movementSelect = `SELECT m.*, p.name parking_name, u.code unit_code, creator.name created_by_name,
  (SELECT occurred_at FROM movements WHERE entry_id = m.id) exit_at
  FROM movements m LEFT JOIN parkings p ON p.id = m.parking_id LEFT JOIN units u ON u.id = m.unit_id
  JOIN users creator ON creator.id = m.created_by`;

export class MobilityService {
  constructor(public db: Database) {}
  audit(user: User, action: string, entity: string, id: number | null, detail = '') {
    this.db.run(
      'INSERT INTO audit(user_id,action,entity,entity_id,detail,occurred_at) VALUES(?,?,?,?,?,?)',
      user.id,
      action,
      entity,
      id,
      detail,
      new Date().toISOString(),
    );
  }
  requireOperator(user: User) {
    if (user.role === 'directivo') throw new AppError('Tu rol tiene acceso de consulta.', 403);
  }
  requireAdmin(user: User) {
    if (user.role !== 'administrador')
      throw new AppError('Esta acción requiere permisos de administrador.', 403);
  }
  parkings() {
    return this.db.all<Parking>(
      'SELECT p.*, (SELECT COUNT(*) FROM presence WHERE parking_id = p.id) occupied FROM parkings p ORDER BY p.id',
    );
  }
  units() {
    return this.db.all<Unit>('SELECT * FROM units ORDER BY code');
  }
  users(user: User) {
    this.requireAdmin(user);
    return this.db.all<User>('SELECT id,username,name,role,active FROM users ORDER BY id');
  }
  movements(raw: unknown): Movement[] {
    const filters = filterSchema.parse(raw);
    const clauses: string[] = [];
    const params: SQLInputValue[] = [];
    // Las fechas de los filtros representan días del campus; los instantes se guardan en UTC.
    if (filters.from) {
      clauses.push('m.occurred_at >= ?');
      params.push(new Date(`${filters.from}T00:00:00-06:00`).toISOString());
    }
    if (filters.to) {
      clauses.push('m.occurred_at < ?');
      params.push(new Date(Date.parse(`${filters.to}T00:00:00-06:00`) + 86400000).toISOString());
    }
    if (filters.plate) {
      clauses.push("m.plate LIKE ? ESCAPE '\\'");
      params.push(
        `%${filters.plate
          .toUpperCase()
          .replace(/[\s-]/g, '')
          .replace(/[\\%_]/g, '\\$&')}%`,
      );
    }
    for (const [key, column] of [
      ['category', 'category'],
      ['type', 'type'],
      ['parking', 'parking_id'],
      ['unit', 'unit_id'],
    ] as const) {
      if (filters[key]) {
        clauses.push(`m.${column} = ?`);
        params.push(filters[key]);
      }
    }
    let rows = this.db.all<Movement>(
      `${movementSelect} ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''} ORDER BY m.occurred_at DESC, m.id DESC`,
      ...params,
    );
    if (filters.timeFrom) rows = rows.filter((row) => localTime(row.occurred_at) >= filters.timeFrom!);
    if (filters.timeTo) rows = rows.filter((row) => localTime(row.occurred_at) <= filters.timeTo!);
    return rows;
  }
  movement(id: number) {
    const row = this.db.get<Movement>(`${movementSelect} WHERE m.id = ?`, id);
    if (!row) throw new AppError('No se encontró el movimiento.', 404);
    return row;
  }
  inside() {
    return this.db.all<Movement>(
      `${movementSelect} JOIN presence present ON present.entry_id = m.id ORDER BY m.occurred_at DESC`,
    );
  }
  registerMovement(user: User, raw: unknown): Movement {
    this.requireOperator(user);
    const input = movementSchema.parse(raw);
    return this.db.transaction(() => {
      const previous = this.db.get<{ occurred_at: string }>(
        'SELECT occurred_at FROM movements WHERE plate = ? ORDER BY occurred_at DESC LIMIT 1',
        input.plate,
      );
      if (previous && input.occurred_at < previous.occurred_at)
        throw new AppError('El horario debe ser igual o posterior al último movimiento de esta placa.');
      const present = this.db.get<{ entry_id: number }>(
        'SELECT entry_id FROM presence WHERE plate = ?',
        input.plate,
      );
      let parkingId = input.parking_id;
      let unitId = input.unit_id;
      if (input.type === 'entrada') {
        if (present)
          throw new AppError(
            'Este vehículo ya está dentro. Registra su salida antes de una nueva entrada.',
            409,
          );
        if (input.category === 'particular') {
          if (this.db.get('SELECT 1 FROM units WHERE plate = ?', input.plate))
            throw new AppError(
              'Esta placa pertenece a una unidad del catálogo. Utiliza su categoría correspondiente.',
            );
          const parking = this.parkings().find((p) => p.id === parkingId && p.active);
          if (!parking) throw new AppError('Selecciona un estacionamiento activo.');
          if (parking.occupied >= parking.capacity)
            throw new AppError('El estacionamiento está lleno. Selecciona otro.', 409);
          unitId = null;
        } else {
          const unit = this.db.get<Unit>('SELECT * FROM units WHERE id = ? AND active = 1', unitId);
          if (!unit || unit.category !== input.category || unit.plate !== input.plate)
            throw new AppError('La unidad y su placa deben corresponder al catálogo activo.');
          parkingId = null;
        }
      } else {
        if (!present) throw new AppError('No existe una entrada abierta para esta placa.', 409);
        const entry = this.movement(present.entry_id);
        if (entry.category !== input.category)
          throw new AppError('La categoría debe coincidir con la entrada.');
        parkingId = entry.parking_id;
        unitId = entry.unit_id;
      }
      if (input.category !== 'transporte' && (input.boarded || input.alighted))
        throw new AppError('Los conteos de estudiantes solo corresponden a transporte.');
      const result = this.db.run(
        `INSERT INTO movements(plate,category,type,access,parking_id,unit_id,occurred_at,entry_id,boarded,alighted,note,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        input.plate,
        input.category,
        input.type,
        input.access,
        parkingId,
        unitId,
        input.occurred_at,
        present?.entry_id ?? null,
        input.boarded,
        input.alighted,
        input.note,
        user.id,
        new Date().toISOString(),
      );
      const id = Number(result.lastInsertRowid);
      if (input.type === 'entrada')
        this.db.run(
          'INSERT INTO presence(plate,entry_id,parking_id) VALUES(?,?,?)',
          input.plate,
          id,
          parkingId,
        );
      else this.db.run('DELETE FROM presence WHERE plate = ?', input.plate);
      this.audit(
        user,
        input.type === 'entrada' ? 'Entrada registrada' : 'Salida registrada',
        'movimiento',
        id,
        `${input.plate} · ${input.access}`,
      );
      return this.movement(id);
    });
  }
  changeStatus(user: User, id: number, raw: unknown) {
    this.requireOperator(user);
    const input = statusChangeSchema.parse(raw);
    return this.db.transaction(() => {
      const unit = this.db.get<Unit>(
        "SELECT * FROM units WHERE id = ? AND category = 'seguridad' AND active = 1",
        id,
      );
      if (!unit) throw new AppError('No se encontró una unidad de seguridad activa.', 404);
      if (unit.status === input.status) throw new AppError('La unidad ya tiene ese estado.');
      const now = new Date().toISOString();
      this.db.run('UPDATE units SET status = ?, updated_at = ? WHERE id = ?', input.status, now, id);
      this.db.run(
        'INSERT INTO security_history(unit_id,previous_status,status,note,occurred_at,created_by) VALUES(?,?,?,?,?,?)',
        id,
        unit.status,
        input.status,
        input.note,
        now,
        user.id,
      );
      this.audit(
        user,
        'Estado actualizado',
        'unidad',
        id,
        `${unit.code}: ${unit.status} → ${input.status}${input.note ? ` · ${input.note}` : ''}`,
      );
      return this.db.get<Unit>('SELECT * FROM units WHERE id = ?', id)!;
    });
  }
  history(raw: unknown): History[] {
    const filters = filterSchema.parse(raw);
    return this.db
      .all<History>(
        'SELECT h.*, u.code unit_code, creator.name username FROM security_history h JOIN units u ON u.id = h.unit_id JOIN users creator ON creator.id = h.created_by ORDER BY occurred_at DESC, h.id DESC',
      )
      .filter(
        (row) =>
          (!filters.unit || row.unit_id === Number(filters.unit)) &&
          (!filters.status || row.status === filters.status) &&
          (!filters.from || localDate(new Date(row.occurred_at)) >= filters.from) &&
          (!filters.to || localDate(new Date(row.occurred_at)) <= filters.to),
      );
  }
  auditLog(user: User, raw: unknown): Audit[] {
    this.requireAdmin(user);
    const filters = filterSchema.parse(raw);
    return this.db
      .all<Audit>('SELECT a.*, u.username FROM audit a JOIN users u ON u.id = a.user_id ORDER BY a.id DESC')
      .filter(
        (row) =>
          (!filters.from || localDate(new Date(row.occurred_at)) >= filters.from) &&
          (!filters.to || localDate(new Date(row.occurred_at)) <= filters.to),
      );
  }
  dashboard(filters: Filters): Dashboard {
    const rows = this.movements(filters);
    const hourly = Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, '0')}:00`,
      entries: 0,
      exits: 0,
    }));
    for (const row of rows)
      hourly[Number(localTime(row.occurred_at).slice(0, 2))][row.type === 'entrada' ? 'entries' : 'exits']++;
    return {
      entries: rows.filter((r) => r.type === 'entrada').length,
      exits: rows.filter((r) => r.type === 'salida').length,
      inside: this.db.get<{ total: number }>('SELECT COUNT(*) total FROM presence')!.total,
      boarded: rows.reduce((sum, r) => sum + r.boarded, 0),
      alighted: rows.reduce((sum, r) => sum + r.alighted, 0),
      hourly,
      recent: rows.slice(0, 7),
    };
  }
  saveParking(user: User, id: number | null, raw: unknown) {
    this.requireAdmin(user);
    const input = parkingSchema.parse(raw);
    return this.db.transaction(() => {
      if (id) {
        const parking = this.parkings().find((p) => p.id === id);
        if (!parking) throw new AppError('Estacionamiento no encontrado.', 404);
        if (input.capacity < parking.occupied)
          throw new AppError('La capacidad no puede ser menor que la ocupación actual.');
        if (!input.active && parking.occupied)
          throw new AppError('Registra las salidas antes de desactivar este estacionamiento.');
        this.db.run(
          'UPDATE parkings SET name=?,capacity=?,active=? WHERE id=?',
          input.name,
          input.capacity,
          input.active,
          id,
        );
      } else
        id = Number(
          this.db.run(
            'INSERT INTO parkings(name,capacity,active) VALUES(?,?,?)',
            input.name,
            input.capacity,
            input.active,
          ).lastInsertRowid,
        );
      this.audit(user, 'Estacionamiento guardado', 'estacionamiento', id, JSON.stringify(input));
      return this.parkings().find((p) => p.id === id)!;
    });
  }
  saveUnit(user: User, id: number | null, raw: unknown) {
    this.requireAdmin(user);
    const input = unitSchema.parse(raw);
    return this.db.transaction(() => {
      if (id) {
        const unit = this.db.get<Unit>('SELECT * FROM units WHERE id=?', id);
        if (!unit) throw new AppError('Unidad no encontrada.', 404);
        if (unit.category !== input.category)
          throw new AppError('La categoría de una unidad existente no se puede cambiar.');
        if (
          this.db.get('SELECT 1 FROM presence WHERE plate=?', unit.plate) &&
          (!input.active || input.plate !== unit.plate)
        )
          throw new AppError('La unidad debe salir antes de cambiar su placa o desactivarla.');
        if (input.plate !== unit.plate && this.db.get('SELECT 1 FROM presence WHERE plate=?', input.plate))
          throw new AppError('La nueva placa ya está dentro de la Facultad.');
        this.db.run(
          'UPDATE units SET code=?,plate=?,route=?,capacity=?,active=? WHERE id=?',
          input.code,
          input.plate,
          input.route,
          input.capacity,
          input.active,
          id,
        );
      } else {
        if (this.db.get('SELECT 1 FROM presence WHERE plate=?', input.plate))
          throw new AppError('Esta placa ya está dentro de la Facultad.');
        id = Number(
          this.db.run(
            'INSERT INTO units(code,plate,category,route,capacity,active,updated_at) VALUES(?,?,?,?,?,?,?)',
            input.code,
            input.plate,
            input.category,
            input.route,
            input.capacity,
            input.active,
            new Date().toISOString(),
          ).lastInsertRowid,
        );
        if (input.category === 'seguridad')
          this.db.run(
            "INSERT INTO security_history(unit_id,previous_status,status,note,occurred_at,created_by) VALUES(?,NULL,'inactivo','Alta de unidad',?,?)",
            id,
            new Date().toISOString(),
            user.id,
          );
      }
      this.audit(user, 'Unidad guardada', 'unidad', id, JSON.stringify(input));
      return this.db.get<Unit>('SELECT * FROM units WHERE id=?', id)!;
    });
  }
  saveUser(user: User, id: number | null, raw: unknown) {
    this.requireAdmin(user);
    const input = userSchema.parse(raw);
    return this.db.transaction(() => {
      if (id) {
        const current = this.db.get<User>('SELECT id,username,name,role,active FROM users WHERE id=?', id);
        if (!current) throw new AppError('Usuario no encontrado.', 404);
        if (
          current.role === 'administrador' &&
          current.active &&
          (input.role !== 'administrador' || !input.active) &&
          this.db.get<{ total: number }>(
            "SELECT COUNT(*) total FROM users WHERE role='administrador' AND active=1",
          )!.total <= 1
        )
          throw new AppError('Debe permanecer al menos un administrador activo.');
        this.db.run(
          'UPDATE users SET username=?,name=?,role=?,active=? WHERE id=?',
          input.username,
          input.name,
          input.role,
          input.active,
          id,
        );
        if (input.password)
          this.db.run('UPDATE users SET password_hash=? WHERE id=?', hashPassword(input.password), id);
        if (input.password || !input.active || input.role !== current.role)
          this.db.run('DELETE FROM sessions WHERE user_id=?', id);
      } else {
        if (!input.password) throw new AppError('La contraseña es obligatoria al crear un usuario.');
        id = Number(
          this.db.run(
            'INSERT INTO users(username,name,password_hash,role,active) VALUES(?,?,?,?,?)',
            input.username,
            input.name,
            hashPassword(input.password),
            input.role,
            input.active,
          ).lastInsertRowid,
        );
      }
      this.audit(
        user,
        'Usuario guardado',
        'usuario',
        id,
        `${input.username} · ${input.role} · ${input.active ? 'activo' : 'inactivo'}`,
      );
      return this.db.get<User>('SELECT id,username,name,role,active FROM users WHERE id=?', id)!;
    });
  }
}
