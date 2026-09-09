export type Role = 'administrador' | 'seguridad' | 'directivo';
export type Category = 'particular' | 'transporte' | 'seguridad';
export type SecurityStatus = 'inactivo' | 'en_ronda' | 'incidente' | 'mantenimiento';
export interface User {
  id: number;
  username: string;
  name: string;
  role: Role;
  active: number;
}
export interface Parking {
  id: number;
  name: string;
  capacity: number;
  active: number;
  occupied: number;
}
export interface Unit {
  id: number;
  code: string;
  plate: string;
  category: 'transporte' | 'seguridad';
  route: string;
  capacity: number;
  active: number;
  status: SecurityStatus;
  updated_at: string;
}
export interface Movement {
  id: number;
  plate: string;
  category: Category;
  type: 'entrada' | 'salida';
  access: string;
  parking_id: number | null;
  parking_name: string | null;
  unit_id: number | null;
  unit_code: string | null;
  occurred_at: string;
  entry_id: number | null;
  boarded: number;
  alighted: number;
  note: string;
  created_by: number;
  created_by_name: string;
  created_at: string;
  exit_at: string | null;
}
export interface History {
  id: number;
  unit_id: number;
  unit_code: string;
  previous_status: SecurityStatus | null;
  status: SecurityStatus;
  note: string;
  occurred_at: string;
  username: string;
}
export interface Audit {
  id: number;
  username: string;
  action: string;
  entity: string;
  entity_id: number | null;
  detail: string;
  occurred_at: string;
}
export interface Filters {
  from?: string;
  to?: string;
  plate?: string;
  category?: Category | '';
  type?: string;
  parking?: string;
  unit?: string;
  timeFrom?: string;
  timeTo?: string;
  status?: string;
}
export interface Dashboard {
  entries: number;
  exits: number;
  inside: number;
  boarded: number;
  alighted: number;
  hourly: { hour: string; entries: number; exits: number }[];
  recent: Movement[];
}
export interface Overview {
  user: User;
  parkings: Parking[];
  units: Unit[];
  dashboard: Dashboard;
  demo: boolean;
}
export const STATUS_LABELS: Record<SecurityStatus, string> = {
  inactivo: 'Inactiva',
  en_ronda: 'En ronda',
  incidente: 'Atendiendo incidente',
  mantenimiento: 'En mantenimiento',
};
export const CATEGORY_LABELS: Record<Category, string> = {
  particular: 'Particular',
  transporte: 'Transporte',
  seguridad: 'Seguridad',
};
export const ROLE_LABELS: Record<Role, string> = {
  administrador: 'Administrador',
  seguridad: 'Personal de seguridad',
  directivo: 'Directivo',
};
