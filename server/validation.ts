import { z } from 'zod';

const text = (max: number) => z.string().trim().min(1, 'Este campo es obligatorio.').max(max);
export const idSchema = z.coerce.number().int().positive();
export const roleSchema = z.enum(['administrador', 'seguridad', 'directivo']);
export const categorySchema = z.enum(['particular', 'transporte', 'seguridad']);
export const statusSchema = z.enum(['inactivo', 'en_ronda', 'incidente', 'mantenimiento']);
const plateSchema = text(15)
  .transform((value) => value.toUpperCase().replace(/[\s-]/g, ''))
  .pipe(z.string().regex(/^[A-Z0-9]{3,12}$/, 'Escribe una placa de 3 a 12 letras o números.'));
export const movementSchema = z
  .object({
    plate: plateSchema,
    category: categorySchema,
    type: z.enum(['entrada', 'salida']),
    access: text(80),
    parking_id: z.number().int().positive().nullable().default(null),
    unit_id: z.number().int().positive().nullable().default(null),
    occurred_at: z.iso
      .datetime({ offset: true })
      .transform((value) => new Date(value).toISOString())
      .refine((value) => Date.parse(value) <= Date.now() + 60_000, 'No se permiten movimientos futuros.'),
    boarded: z.number().int().min(0).max(10000).default(0),
    alighted: z.number().int().min(0).max(10000).default(0),
    note: z.string().trim().max(500).default(''),
  })
  .strict();
export const parkingSchema = z
  .object({
    name: text(80),
    capacity: z.number().int().min(1).max(10000),
    active: z.union([z.literal(0), z.literal(1)]).default(1),
  })
  .strict();
export const unitSchema = z
  .object({
    code: text(30),
    plate: plateSchema,
    category: z.enum(['transporte', 'seguridad']),
    route: z.string().trim().max(120).default(''),
    capacity: z.number().int().min(0).max(300).default(0),
    active: z.union([z.literal(0), z.literal(1)]).default(1),
  })
  .strict();
export const userSchema = z
  .object({
    username: text(40).regex(/^[a-zA-Z0-9_.-]+$/),
    name: text(80),
    role: roleSchema,
    active: z.union([z.literal(0), z.literal(1)]).default(1),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.').max(128).optional(),
  })
  .strict();
export const loginSchema = z.object({ username: text(40), password: z.string().min(1).max(128) }).strict();
export const statusChangeSchema = z
  .object({ status: statusSchema, note: z.string().trim().max(500).default('') })
  .strict();
const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
  .optional();
export const filterSchema = z
  .object({
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    plate: z.string().max(30).optional(),
    category: categorySchema.optional(),
    type: z.enum(['entrada', 'salida']).optional(),
    parking: z.string().regex(/^\d+$/).optional(),
    unit: z.string().regex(/^\d+$/).optional(),
    timeFrom: time,
    timeTo: time,
    status: statusSchema.optional(),
  })
  .strict()
  .refine((f) => !f.from || !f.to || f.from <= f.to, 'La fecha inicial debe ser anterior a la final.')
  .refine(
    (f) => !f.timeFrom || !f.timeTo || f.timeFrom <= f.timeTo,
    'La hora inicial debe ser anterior a la final.',
  );
