import express, { type ErrorRequestHandler, type RequestHandler } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import { ZodError } from 'zod';
import { Database, verifyPassword, hashPassword } from './database.ts';
import { MobilityService, AppError, localDate, localTime } from './service.ts';
import { filterSchema, idSchema, loginSchema } from './validation.ts';
import type { User } from '../shared/types.ts';

export function csv(rows: unknown[][]): string {
  // Se neutralizan fórmulas al abrir el archivo en hojas de cálculo.
  return (
    '\uFEFF' +
    rows
      .map((row) =>
        row
          .map((value) => {
            let cell = String(value ?? '');
            if (/^[\s]*[=+@-]/.test(cell) || /^[\t\r\n]/.test(cell)) cell = `'${cell}`;
            return `"${cell.replace(/"/g, '""')}"`;
          })
          .join(','),
      )
      .join('\r\n')
  );
}

export function createApp(db: Database) {
  const app = express();
  const service = new MobilityService(db);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
  });
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.get('/api/login-info', (_req, res) =>
    res.json({
      demo: db.get<{ value: string }>("SELECT value FROM metadata WHERE key='demo'")?.value === '1',
    }),
  );
  const csrf: RequestHandler = (req, _res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      if (!req.is('application/json') || req.get('X-Requested-With') !== 'MovilidadAragon')
        return next(new AppError('Solicitud no autorizada.', 403));
      if (req.get('origin') && req.get('origin') !== `${req.protocol}://${req.get('host')}`)
        return next(new AppError('El origen de la solicitud no está permitido.', 403));
    }
    next();
  };
  app.use('/api', csrf);
  const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
  const cookieToken = (header = '') =>
    header
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('aragon_session='))
      ?.slice('aragon_session='.length) ?? '';
  const attempts = new Map<string, { count: number; until: number }>();
  const dummyHash = hashPassword(randomBytes(24).toString('hex'));
  app.post('/api/login', (req, res) => {
    const input = loginSchema.parse(req.body);
    const key = req.ip ?? 'local';
    const now = Date.now();
    for (const [ip, value] of attempts) if (value.until < now) attempts.delete(ip);
    const attempt = attempts.get(key);
    if (attempt && attempt.count >= 15)
      throw new AppError('Demasiados intentos. Espera 5 minutos antes de volver a intentar.', 429);
    const row = db.get<User & { password_hash: string }>(
      'SELECT * FROM users WHERE username = ?',
      input.username,
    );
    const valid = verifyPassword(input.password, row?.password_hash ?? dummyHash);
    if (!row || !row.active || !valid) {
      attempts.set(key, { count: (attempt?.count ?? 0) + 1, until: attempt?.until ?? now + 300000 });
      throw new AppError('Usuario o contraseña incorrectos.', 401);
    }
    attempts.delete(key);
    const token = randomBytes(32).toString('hex');
    db.run('DELETE FROM sessions WHERE expires_at < ?', new Date().toISOString());
    db.run(
      'INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)',
      tokenHash(token),
      row.id,
      new Date(now + 8 * 3600000).toISOString(),
    );
    service.audit(row, 'Inicio de sesión', 'usuario', row.id);
    res.cookie('aragon_session', token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: req.secure,
      maxAge: 8 * 3600000,
      path: '/',
    });
    const { password_hash: _hash, ...user } = row;
    void _hash;
    res.json(user);
  });
  const authenticated: RequestHandler = (req, res, next) => {
    const user = db.get<User>(
      `SELECT u.id,u.username,u.name,u.role,u.active FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1`,
      tokenHash(cookieToken(req.get('cookie'))),
      new Date().toISOString(),
    );
    if (!user) return next(new AppError('Inicia sesión para continuar.', 401));
    res.locals.user = user;
    next();
  };
  app.use('/api', authenticated);
  app.get('/api/me', (_req, res) => res.json(res.locals.user as User));
  app.post('/api/logout', (req, res) => {
    db.run('DELETE FROM sessions WHERE token_hash=?', tokenHash(cookieToken(req.get('cookie'))));
    service.audit(res.locals.user as User, 'Cierre de sesión', 'usuario', (res.locals.user as User).id);
    res.clearCookie('aragon_session', { path: '/' });
    res.json({ ok: true });
  });
  app.get('/api/overview', (req, res) => {
    const filters = filterSchema.parse(req.query);
    const dates = Object.keys(filters).length ? filters : { from: localDate(), to: localDate() };
    res.json({
      user: res.locals.user,
      parkings: service.parkings(),
      units: service.units(),
      dashboard: service.dashboard(dates),
      demo: db.get<{ value: string }>("SELECT value FROM metadata WHERE key='demo'")?.value === '1',
    });
  });
  app.get('/api/movements', (req, res) => res.json(service.movements(req.query)));
  app.get('/api/presence', (_req, res) => res.json(service.inside()));
  app.get('/api/movements/:id', (req, res) => res.json(service.movement(idSchema.parse(req.params.id))));
  app.post('/api/movements', (req, res) =>
    res.status(201).json(service.registerMovement(res.locals.user as User, req.body)),
  );
  app.get('/api/security/history', (req, res) => res.json(service.history(req.query)));
  app.patch('/api/units/:id/status', (req, res) =>
    res.json(service.changeStatus(res.locals.user as User, idSchema.parse(req.params.id), req.body)),
  );
  app.get('/api/users', (_req, res) => res.json(service.users(res.locals.user as User)));
  app.get('/api/audit', (req, res) => res.json(service.auditLog(res.locals.user as User, req.query)));
  app.post('/api/parkings', (req, res) =>
    res.status(201).json(service.saveParking(res.locals.user as User, null, req.body)),
  );
  app.put('/api/parkings/:id', (req, res) =>
    res.json(service.saveParking(res.locals.user as User, idSchema.parse(req.params.id), req.body)),
  );
  app.post('/api/units', (req, res) =>
    res.status(201).json(service.saveUnit(res.locals.user as User, null, req.body)),
  );
  app.put('/api/units/:id', (req, res) =>
    res.json(service.saveUnit(res.locals.user as User, idSchema.parse(req.params.id), req.body)),
  );
  app.post('/api/users', (req, res) =>
    res.status(201).json(service.saveUser(res.locals.user as User, null, req.body)),
  );
  app.put('/api/users/:id', (req, res) =>
    res.json(service.saveUser(res.locals.user as User, idSchema.parse(req.params.id), req.body)),
  );
  app.get('/api/reports/movements.csv', (req, res) => {
    const rows = service.movements(req.query);
    res
      .attachment('movimientos-aragon.csv')
      .type('text/csv')
      .send(
        csv([
          [
            'Folio',
            'Placa',
            'Categoría',
            'Movimiento',
            'Fecha campus',
            'Hora campus',
            'Acceso',
            'Estacionamiento',
            'Unidad',
            'Abordan',
            'Descienden',
            'Responsable',
            'Observación',
            'Entrada vinculada',
            'Fecha de captura UTC',
          ],
          ...rows.map((r) => [
            r.id,
            r.plate,
            r.category,
            r.type,
            localDate(new Date(r.occurred_at)),
            localTime(r.occurred_at),
            r.access,
            r.parking_name,
            r.unit_code,
            r.boarded,
            r.alighted,
            r.created_by_name,
            r.note,
            r.entry_id,
            r.created_at,
          ]),
        ]),
      );
  });
  app.get('/api/reports/security.csv', (req, res) => {
    res
      .attachment('historial-seguridad-aragon.csv')
      .type('text/csv')
      .send(
        csv([
          ['Unidad', 'Estado anterior', 'Estado', 'Fecha y hora UTC', 'Responsable', 'Observación'],
          ...service
            .history(req.query)
            .map((r) => [r.unit_code, r.previous_status, r.status, r.occurred_at, r.username, r.note]),
        ]),
      );
  });
  app.get('/api/reports/audit.csv', (req, res) => {
    res
      .attachment('bitacora-aragon.csv')
      .type('text/csv')
      .send(
        csv([
          ['Folio', 'Usuario', 'Acción', 'Entidad', 'Registro', 'Detalle', 'Fecha y hora UTC'],
          ...service
            .auditLog(res.locals.user as User, req.query)
            .map((r) => [r.id, r.username, r.action, r.entity, r.entity_id, r.detail, r.occurred_at]),
        ]),
      );
  });
  app.use('/api', (_req, _res, next) => next(new AppError('Ruta no encontrada.', 404)));
  const errors: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    // Express identifica el manejador de errores por sus cuatro parámetros.
    void _next;
    if (error instanceof ZodError) {
      res.status(400).json({
        error: error.issues.map((issue) => `${issue.path.join('.') || 'Datos'}: ${issue.message}`).join(' '),
      });
      return;
    }
    if (error instanceof AppError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      res.status(409).json({ error: 'Ya existe un registro con ese nombre, placa o identificador.' });
      return;
    }
    if (error instanceof SyntaxError) {
      res.status(400).json({ error: 'El contenido de la solicitud no es válido.' });
      return;
    }
    console.error('Error interno al procesar una solicitud.');
    res.status(500).json({ error: 'No se pudo completar la operación. Vuelve a intentar.' });
  };
  app.use(errors);
  return app;
}
