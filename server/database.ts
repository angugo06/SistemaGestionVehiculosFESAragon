import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

export function verifyPassword(password: string, hash: string): boolean {
  const [salt, key] = hash.split(':');
  if (!salt || !key) return false;
  const expected = Buffer.from(key, 'hex');
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export class Database {
  readonly connection: DatabaseSync;
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.connection = new DatabaseSync(path);
    this.connection.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
    this.connection.exec(`
      CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE,
        name TEXT NOT NULL, password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('administrador','seguridad','directivo')),
        active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), expires_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS parkings (
        id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE,
        capacity INTEGER NOT NULL CHECK(capacity > 0), active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
      );
      CREATE TABLE IF NOT EXISTS units (
        id INTEGER PRIMARY KEY, code TEXT NOT NULL UNIQUE COLLATE NOCASE,
        plate TEXT NOT NULL UNIQUE COLLATE NOCASE, category TEXT NOT NULL CHECK(category IN ('transporte','seguridad')),
        route TEXT NOT NULL DEFAULT '', capacity INTEGER NOT NULL DEFAULT 0 CHECK(capacity >= 0),
        active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
        status TEXT NOT NULL DEFAULT 'inactivo' CHECK(status IN ('inactivo','en_ronda','incidente','mantenimiento')),
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS movements (
        id INTEGER PRIMARY KEY, plate TEXT NOT NULL, category TEXT NOT NULL CHECK(category IN ('particular','transporte','seguridad')),
        type TEXT NOT NULL CHECK(type IN ('entrada','salida')), access TEXT NOT NULL,
        parking_id INTEGER REFERENCES parkings(id), unit_id INTEGER REFERENCES units(id),
        occurred_at TEXT NOT NULL, entry_id INTEGER UNIQUE REFERENCES movements(id),
        boarded INTEGER NOT NULL DEFAULT 0 CHECK(boarded >= 0), alighted INTEGER NOT NULL DEFAULT 0 CHECK(alighted >= 0),
        note TEXT NOT NULL DEFAULT '', created_by INTEGER NOT NULL REFERENCES users(id), created_at TEXT NOT NULL,
        CHECK((type = 'entrada' AND entry_id IS NULL) OR (type = 'salida' AND entry_id IS NOT NULL)),
        CHECK((category = 'particular' AND parking_id IS NOT NULL AND unit_id IS NULL) OR
              (category != 'particular' AND unit_id IS NOT NULL AND parking_id IS NULL))
      );
      CREATE TABLE IF NOT EXISTS presence (
        plate TEXT PRIMARY KEY, entry_id INTEGER NOT NULL UNIQUE REFERENCES movements(id),
        parking_id INTEGER REFERENCES parkings(id)
      );
      CREATE TABLE IF NOT EXISTS security_history (
        id INTEGER PRIMARY KEY, unit_id INTEGER NOT NULL REFERENCES units(id), previous_status TEXT,
        status TEXT NOT NULL, note TEXT NOT NULL, occurred_at TEXT NOT NULL, created_by INTEGER NOT NULL REFERENCES users(id)
      );
      CREATE TABLE IF NOT EXISTS audit (
        id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), action TEXT NOT NULL,
        entity TEXT NOT NULL, entity_id INTEGER, detail TEXT NOT NULL DEFAULT '', occurred_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS movements_date ON movements(occurred_at);
      CREATE INDEX IF NOT EXISTS movements_plate ON movements(plate, occurred_at);
      CREATE INDEX IF NOT EXISTS history_unit ON security_history(unit_id, occurred_at);
      CREATE INDEX IF NOT EXISTS presence_parking ON presence(parking_id);
      PRAGMA user_version = 1;
    `);
  }
  get<T>(sql: string, ...params: SQLInputValue[]): T | undefined {
    return this.connection.prepare(sql).get(...params) as T | undefined;
  }
  all<T>(sql: string, ...params: SQLInputValue[]): T[] {
    return this.connection.prepare(sql).all(...params) as T[];
  }
  run(sql: string, ...params: SQLInputValue[]) {
    return this.connection.prepare(sql).run(...params);
  }
  transaction<T>(operation: () => T): T {
    this.connection.exec('BEGIN IMMEDIATE');
    try {
      const result = operation();
      this.connection.exec('COMMIT');
      return result;
    } catch (error) {
      this.connection.exec('ROLLBACK');
      throw error;
    }
  }
  close() {
    this.connection.close();
  }
}
