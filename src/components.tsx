import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Inbox,
  LoaderCircle,
  Search,
  SlidersHorizontal,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import type { Category, Filters, Movement, Parking, SecurityStatus, Unit } from '../shared/types';
import { CATEGORY_LABELS, STATUS_LABELS } from '../shared/types';
import { formatDate, formatTime, number, query, today, daysBefore } from './lib';

export function Badge({ status }: { status: SecurityStatus }) {
  return (
    <span className={`badge ${status}`}>
      <i />
      {STATUS_LABELS[status]}
    </span>
  );
}
export function MovementBadge({ type }: { type: Movement['type'] }) {
  return (
    <span className={`movement-badge ${type}`}>
      {type === 'entrada' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
      {type === 'entrada' ? 'Entrada' : 'Salida'}
    </span>
  );
}
export function ErrorBox({ message }: { message: string }) {
  return message ? (
    <div className="error-box" role="alert">
      <AlertCircle size={18} />
      <span>{message}</span>
    </div>
  ) : null;
}
export function Empty({
  title = 'No hay registros en este periodo',
  text = 'Prueba con otro rango de fechas o cambia los filtros.',
}: {
  title?: string;
  text?: string;
}) {
  return (
    <div className="empty">
      <span>
        <Inbox size={27} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle size={22} className="spin" /> Cargando información…
    </div>
  );
}
export function Panel({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function Stat({
  label,
  value,
  foot,
  icon,
  tone = '',
}: {
  label: string;
  value: string | number;
  foot: string;
  icon: ReactNode;
  tone?: string;
}) {
  return (
    <div className={`stat ${tone}`}>
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <strong>{typeof value === 'number' ? number(value) : value}</strong>
      <span className="stat-foot">{foot}</span>
    </div>
  );
}
export function DateRange({ filters, onChange }: { filters: Filters; onChange: (filters: Filters) => void }) {
  const active =
    filters.to === today()
      ? filters.from === today()
        ? 1
        : filters.from === daysBefore(6)
          ? 7
          : filters.from === daysBefore(29)
            ? 30
            : 0
      : 0;
  return (
    <div className="date-range">
      <div className="segmented">
        {[
          [1, 'Hoy'],
          [7, '7 días'],
          [30, '30 días'],
        ].map(([days, label]) => (
          <button
            key={days}
            className={active === days ? 'selected' : ''}
            onClick={() => onChange({ ...filters, from: daysBefore(Number(days) - 1), to: today() })}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="date-inputs">
        <input
          aria-label="Fecha inicial"
          type="date"
          value={filters.from || ''}
          max={filters.to || today()}
          onChange={(event) => onChange({ ...filters, from: event.target.value })}
        />
        <span>—</span>
        <input
          aria-label="Fecha final"
          type="date"
          value={filters.to || ''}
          min={filters.from}
          max={today()}
          onChange={(event) => onChange({ ...filters, to: event.target.value })}
        />
      </div>
    </div>
  );
}
export function FilterBar({
  filters,
  onChange,
  parkings,
  units,
  category,
  security = false,
  presentOnly = false,
}: {
  filters: Filters;
  onChange: (filters: Filters) => void;
  parkings: Parking[];
  units: Unit[];
  category?: Category;
  security?: boolean;
  presentOnly?: boolean;
}) {
  const [advanced, setAdvanced] = useState(false);
  return (
    <div className="filter-bar">
      <div className="filter-main">
        {!security && (
          <label className="search-field">
            <Search size={17} />
            <input
              aria-label="Buscar placa"
              placeholder="Buscar por placa…"
              value={filters.plate || ''}
              onChange={(event) => onChange({ ...filters, plate: event.target.value })}
            />
          </label>
        )}
        {category === 'particular' && (
          <select
            aria-label="Estacionamiento"
            value={filters.parking || ''}
            onChange={(e) => onChange({ ...filters, parking: e.target.value })}
          >
            <option value="">Todos los estacionamientos</option>
            {parkings.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {!p.active ? ' (inactivo)' : ''}
              </option>
            ))}
          </select>
        )}
        {(category === 'transporte' || category === 'seguridad') && (
          <select
            aria-label="Filtrar unidad"
            value={filters.unit || ''}
            onChange={(e) => onChange({ ...filters, unit: e.target.value })}
          >
            <option value="">Todas las unidades</option>
            {units
              .filter((u) => u.category === category)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.code}
                </option>
              ))}
          </select>
        )}
        {security ? (
          <select
            aria-label="Filtrar estado"
            value={filters.status || ''}
            onChange={(e) => onChange({ ...filters, status: e.target.value })}
          >
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        ) : (
          !presentOnly && (
            <select
              aria-label="Tipo de movimiento"
              value={filters.type || ''}
              onChange={(e) => onChange({ ...filters, type: e.target.value })}
            >
              <option value="">Entradas y salidas</option>
              <option value="entrada">Entradas</option>
              <option value="salida">Salidas</option>
            </select>
          )
        )}
        {!security && !presentOnly && (
          <button
            className={`button ghost ${advanced ? 'is-active' : ''}`}
            onClick={() => setAdvanced(!advanced)}
          >
            <SlidersHorizontal size={16} />
            Horario
          </button>
        )}
        <button className="text-button" onClick={() => onChange({ from: filters.from, to: filters.to })}>
          Limpiar
        </button>
      </div>
      {advanced && !security && !presentOnly && (
        <div className="time-filter">
          <label>
            Desde las{' '}
            <input
              aria-label="Hora inicial"
              type="time"
              value={filters.timeFrom || ''}
              onChange={(e) => onChange({ ...filters, timeFrom: e.target.value })}
            />
          </label>
          <label>
            Hasta las{' '}
            <input
              aria-label="Hora final"
              type="time"
              value={filters.timeTo || ''}
              onChange={(e) => onChange({ ...filters, timeTo: e.target.value })}
            />
          </label>
          <small>Hora de Ciudad de México</small>
        </div>
      )}
    </div>
  );
}
export function ExportButton({
  filters,
  kind = 'movements',
}: {
  filters: Filters;
  kind?: 'movements' | 'security' | 'audit';
}) {
  return (
    <a className="button secondary" href={`/api/reports/${kind}.csv?${query(filters)}`} download>
      <Download size={16} />
      Exportar CSV
    </a>
  );
}
export function Paginated<T>({
  rows,
  children,
  pageSize = 10,
}: {
  rows: T[];
  children: (visible: T[]) => ReactNode;
  pageSize?: number;
}) {
  const [page, setPage] = useState(0);
  useEffect(() => {
    setPage(0);
  }, [rows]);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pages - 1);
  return (
    <>
      {children(rows.slice(current * pageSize, (current + 1) * pageSize))}
      {rows.length > 0 && (
        <div className="pagination">
          <span>
            {current * pageSize + 1}–{Math.min((current + 1) * pageSize, rows.length)} de{' '}
            {number(rows.length)} registros
          </span>
          <div>
            <button
              aria-label="Página anterior"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <span>
              Página {current + 1} de {pages}
            </span>
            <button
              aria-label="Página siguiente"
              disabled={current + 1 >= pages}
              onClick={() => setPage(current + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
export function MovementTable({
  rows,
  onDetail,
  compact = false,
  transport = false,
}: {
  rows: Movement[];
  onDetail: (row: Movement) => void;
  compact?: boolean;
  transport?: boolean;
}) {
  if (!rows.length) return <Empty />;
  const render = (visible: Movement[]) => (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>{transport ? 'Unidad / placa' : 'Placa / categoría'}</th>
            <th>Movimiento</th>
            <th>Fecha y hora</th>
            {!compact && (
              <>
                <th>{transport ? 'Estudiantes' : 'Estacionamiento'}</th>
                <th>{transport ? 'Acceso' : 'Salida vinculada'}</th>
              </>
            )}
            <th className="right">Detalle</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => (
            <tr key={row.id}>
              <td>
                <strong className="plate">{transport ? row.unit_code : row.plate}</strong>
                <small>{transport ? row.plate : CATEGORY_LABELS[row.category]}</small>
              </td>
              <td>
                <MovementBadge type={row.type} />
              </td>
              <td>
                <span>{formatTime(row.occurred_at)}</span>
                <small>{formatDate(row.occurred_at)}</small>
              </td>
              {!compact && (
                <>
                  <td>
                    {transport ? (
                      <>
                        <span>{row.boarded} abordan</span>
                        <small>{row.alighted} descienden</small>
                      </>
                    ) : (
                      row.parking_name || row.unit_code || '—'
                    )}
                  </td>
                  <td>
                    {transport ? (
                      row.access
                    ) : row.type === 'salida' ? (
                      <small>Entrada #{String(row.entry_id).padStart(5, '0')}</small>
                    ) : row.exit_at ? (
                      <>
                        <span>{formatTime(row.exit_at)}</span>
                        <small>{formatDate(row.exit_at)}</small>
                      </>
                    ) : (
                      <span className="presence-dot">Dentro</span>
                    )}
                  </td>
                </>
              )}
              <td className="right">
                <button
                  className="icon-button"
                  aria-label={`Ver movimiento ${row.id} de ${row.plate}`}
                  onClick={() => onDetail(row)}
                >
                  <ArrowRight size={17} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  return compact ? render(rows) : <Paginated rows={rows}>{render}</Paginated>;
}
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? 'wide' : ''}`}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === ref.current) {
          const box = ref.current.getBoundingClientRect();
          if (
            event.clientX < box.left ||
            event.clientX > box.right ||
            event.clientY < box.top ||
            event.clientY > box.bottom
          )
            onClose();
        }
      }}
      aria-labelledby="dialog-title"
    >
      <div className="modal-head">
        <div>
          <h2 id="dialog-title">{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button className="icon-button" aria-label="Cerrar ventana" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function FormShell({
  children,
  onSubmit,
  onClose,
  submitLabel = 'Guardar',
  error,
  busy,
}: {
  children: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  submitLabel?: string;
  error: string;
  busy: boolean;
}) {
  return (
    <form onSubmit={onSubmit}>
      <div className="form-content">
        <ErrorBox message={error} />
        {children}
      </div>
      <div className="modal-footer">
        <button type="button" className="button secondary" onClick={onClose} disabled={busy}>
          Cancelar
        </button>
        <button className="button primary" disabled={busy}>
          {busy ? <LoaderCircle size={17} className="spin" /> : <Check size={17} />}
          {busy ? 'Guardando…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
