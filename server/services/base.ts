import { Database } from '../database.ts';
import type { User } from '../../shared/types.ts';

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

export class BaseService {
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
}
