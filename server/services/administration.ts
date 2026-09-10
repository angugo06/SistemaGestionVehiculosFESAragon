import type { Unit, User } from '../../shared/types.ts';
import { hashPassword } from '../database.ts';
import { parkingSchema, unitSchema, userSchema } from '../validation.ts';
import { AppError } from './base.ts';
import { MovementService } from './movements.ts';

export class AdministrationService extends MovementService {
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
  }}
