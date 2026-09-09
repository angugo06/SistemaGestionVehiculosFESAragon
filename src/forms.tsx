import { useState, type FormEvent } from 'react';
import { ArrowDownLeft, ArrowUpRight, BusFront, CarFront, ShieldCheck } from 'lucide-react';
import type { Category, Movement, Overview, Parking, Unit, User } from '../shared/types';
import { CATEGORY_LABELS, ROLE_LABELS, STATUS_LABELS } from '../shared/types';
import { ErrorBox, FormShell, Loading, Modal } from './components';
import { api, errorMessage, localDatetime, useQuery } from './lib';

interface FormProps {
  onClose: () => void;
  onSaved: (message: string) => void;
}
export function MovementForm({
  data,
  initialCategory,
  onClose,
  onSaved,
}: FormProps & { data: Overview; initialCategory: Category }) {
  const [category, setCategory] = useState<Category>(initialCategory);
  const [type, setType] = useState<'entrada' | 'salida'>('entrada');
  const [plate, setPlate] = useState('');
  const [unitId, setUnitId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const presence = useQuery<Movement[]>('/presence', 0);
  const inside = presence.data?.filter((row) => row.category === category) ?? [];
  const selectedUnit = data.units.find((unit) => unit.id === Number(unitId));
  const setVehicleCategory = (value: Category) => {
    setCategory(value);
    setPlate('');
    setUnitId('');
    setError('');
  };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      const enteredPlate = type === 'entrada' && category !== 'particular' ? selectedUnit?.plate : plate;
      const result = await api<Movement>('/movements', 'POST', {
        plate: enteredPlate,
        category,
        type,
        access: fields.get('access'),
        parking_id: category === 'particular' && type === 'entrada' ? Number(fields.get('parking')) : null,
        unit_id: type === 'entrada' && category !== 'particular' ? Number(unitId) : null,
        occurred_at: new Date(`${fields.get('datetime')}:00-06:00`).toISOString(),
        boarded: Number(fields.get('boarded') || 0),
        alighted: Number(fields.get('alighted') || 0),
        note: fields.get('note'),
      });
      onSaved(`${type === 'entrada' ? 'Entrada' : 'Salida'} de ${result.plate} registrada correctamente.`);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Registrar movimiento"
      subtitle="La ocupación y los indicadores se actualizarán al guardar."
      onClose={onClose}
      wide
    >
      <FormShell
        onSubmit={submit}
        onClose={onClose}
        error={error}
        busy={busy}
        submitLabel={`Registrar ${type}`}
      >
        <div className="category-picker">
          {(['particular', 'transporte', 'seguridad'] as const).map((value, i) => (
            <button
              type="button"
              key={value}
              className={category === value ? 'selected' : ''}
              onClick={() => setVehicleCategory(value)}
            >
              {i === 0 ? (
                <CarFront size={20} />
              ) : i === 1 ? (
                <BusFront size={20} />
              ) : (
                <ShieldCheck size={20} />
              )}
              {CATEGORY_LABELS[value]}
            </button>
          ))}
        </div>
        <div className="movement-type">
          <button
            type="button"
            className={type === 'entrada' ? 'selected' : ''}
            onClick={() => {
              setType('entrada');
              setPlate('');
            }}
          >
            <ArrowDownLeft size={17} /> Entrada al campus
          </button>
          <button
            type="button"
            className={type === 'salida' ? 'selected' : ''}
            onClick={() => {
              setType('salida');
              setPlate('');
            }}
          >
            <ArrowUpRight size={17} /> Salida del campus
          </button>
        </div>
        <div className="form-grid">
          {type === 'salida' ? (
            <label className="span-2">
              Vehículo dentro del campus
              <select
                required
                aria-label="Vehículo dentro del campus"
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
              >
                <option value="">Selecciona una entrada abierta</option>
                {inside.map((row) => (
                  <option key={row.id} value={row.plate}>
                    {row.plate} · {row.parking_name || row.unit_code}
                  </option>
                ))}
              </select>
              {presence.loading ? (
                <small>Cargando entradas abiertas…</small>
              ) : (
                !inside.length && <small>No hay vehículos de esta categoría dentro del campus.</small>
              )}
              <ErrorBox message={presence.error} />
            </label>
          ) : category === 'particular' ? (
            <>
              <label>
                Placa
                <input
                  autoComplete="off"
                  required
                  maxLength={15}
                  name="plate"
                  placeholder="Ej. ABC123D"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                />
              </label>
              <label>
                Estacionamiento
                <select aria-label="Estacionamiento" name="parking" required defaultValue="">
                  <option value="" disabled>
                    Selecciona una zona
                  </option>
                  {data.parkings
                    .filter((p) => p.active)
                    .map((p) => (
                      <option key={p.id} value={p.id} disabled={p.occupied >= p.capacity}>
                        {p.name} · {p.capacity - p.occupied} libres
                      </option>
                    ))}
                </select>
              </label>
            </>
          ) : (
            <label className="span-2">
              Unidad
              <select aria-label="Unidad" required value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                <option value="">Selecciona una unidad</option>
                {data.units
                  .filter((u) => u.category === category && u.active)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.code} · {u.plate}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <label>
            Acceso
            <select aria-label="Acceso" name="access" required>
              <option>Acceso principal</option>
              <option>Acceso norte</option>
              <option>Acceso transporte</option>
              <option>Acceso de servicios</option>
            </select>
          </label>
          <label>
            Fecha y hora
            <input
              aria-label="Fecha y hora"
              name="datetime"
              type="datetime-local"
              required
              defaultValue={localDatetime()}
              max={localDatetime()}
            />
            <small>Hora de Ciudad de México</small>
          </label>
          {category === 'transporte' && (
            <>
              <label>
                Estudiantes que abordan
                <input name="boarded" type="number" min="0" max="10000" step="1" required defaultValue="0" />
              </label>
              <label>
                Estudiantes que descienden
                <input name="alighted" type="number" min="0" max="10000" step="1" required defaultValue="0" />
              </label>
              <p className="form-hint span-2">
                Registra solo los estudiantes de este movimiento. Cada abordaje o descenso se contabiliza una
                vez; no representa personas únicas.
              </p>
            </>
          )}
          <label className="span-2">
            Observación <span className="optional">opcional</span>
            <textarea
              name="note"
              rows={3}
              maxLength={500}
              placeholder="Información relevante para la operación. Evita datos personales."
            />
          </label>
        </div>
      </FormShell>
    </Modal>
  );
}
export function StatusForm({ unit, onClose, onSaved }: FormProps & { unit: Unit }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await api(`/units/${unit.id}/status`, 'PATCH', {
        status: fields.get('status'),
        note: fields.get('note'),
      });
      onSaved(`Estado de ${unit.code} actualizado.`);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={`Actualizar ${unit.code}`}
      subtitle={`Estado actual: ${STATUS_LABELS[unit.status]}`}
      onClose={onClose}
    >
      <FormShell onSubmit={submit} onClose={onClose} busy={busy} error={error}>
        <label>
          Nuevo estado
          <select aria-label="Nuevo estado" name="status" required defaultValue="">
            <option value="" disabled>
              Selecciona un estado
            </option>
            {Object.entries(STATUS_LABELS)
              .filter(([value]) => value !== unit.status)
              .map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
          </select>
        </label>
        <label>
          Observación
          <textarea
            name="note"
            rows={4}
            maxLength={500}
            placeholder="Motivo del cambio o detalle operativo."
          />
        </label>
        <p className="form-hint">
          Se conservarán el estado anterior, la fecha y el usuario responsable en el historial.
        </p>
      </FormShell>
    </Modal>
  );
}
export type CatalogEdit =
  { kind: 'parkings'; item?: Parking } | { kind: 'units'; item?: Unit } | { kind: 'users'; item?: User };
export function CatalogForm({ edit, onClose, onSaved }: FormProps & { edit: CatalogEdit }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const labels = { parkings: 'estacionamiento', units: 'unidad', users: 'usuario' };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    setBusy(true);
    let payload: unknown;
    if (edit.kind === 'parkings')
      payload = { name: f.get('name'), capacity: Number(f.get('capacity')), active: Number(f.get('active')) };
    if (edit.kind === 'units')
      payload = {
        code: f.get('code'),
        plate: f.get('plate'),
        category: edit.item?.category || f.get('category'),
        route: f.get('route'),
        capacity: Number(f.get('capacity')),
        active: Number(f.get('active')),
      };
    if (edit.kind === 'users')
      payload = {
        username: f.get('username'),
        name: f.get('name'),
        role: f.get('role'),
        active: Number(f.get('active')),
        ...(f.get('password') ? { password: f.get('password') } : {}),
      };
    try {
      await api(`/${edit.kind}${edit.item ? `/${edit.item.id}` : ''}`, edit.item ? 'PUT' : 'POST', payload);
      onSaved('Cambios guardados correctamente.');
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={`${edit.item ? 'Editar' : 'Agregar'} ${labels[edit.kind]}`}
      subtitle="Los cambios quedarán registrados en la bitácora."
      onClose={onClose}
    >
      <FormShell onSubmit={submit} onClose={onClose} error={error} busy={busy}>
        <div className="form-grid">
          {edit.kind === 'parkings' && (
            <>
              <label className="span-2">
                Nombre
                <input name="name" required maxLength={80} defaultValue={edit.item?.name} />
              </label>
              <label>
                Capacidad total
                <input
                  name="capacity"
                  type="number"
                  required
                  min="1"
                  max="10000"
                  step="1"
                  defaultValue={edit.item?.capacity || 50}
                />
              </label>
            </>
          )}
          {edit.kind === 'units' && (
            <>
              <label>
                Identificador
                <input
                  name="code"
                  required
                  maxLength={30}
                  defaultValue={edit.item?.code}
                  placeholder="Ej. ÁGUILA 05"
                />
              </label>
              <label>
                Placa
                <input name="plate" required maxLength={15} defaultValue={edit.item?.plate} />
              </label>
              <label>
                Categoría
                <select
                  aria-label="Categor?a"
                  name="category"
                  defaultValue={edit.item?.category || 'transporte'}
                  disabled={!!edit.item}
                >
                  <option value="transporte">Transporte</option>
                  <option value="seguridad">Seguridad escolar</option>
                </select>
              </label>
              <label>
                Capacidad de pasajeros
                <input
                  name="capacity"
                  type="number"
                  required
                  min="0"
                  max="300"
                  step="1"
                  defaultValue={edit.item?.capacity || 0}
                />
              </label>
              <label className="span-2">
                Ruta o zona asignada
                <input name="route" maxLength={120} defaultValue={edit.item?.route} />
              </label>
            </>
          )}
          {edit.kind === 'users' && (
            <>
              <label>
                Usuario
                <input
                  name="username"
                  required
                  maxLength={40}
                  pattern="[a-zA-Z0-9_.\-]+"
                  defaultValue={edit.item?.username}
                  autoComplete="off"
                />
              </label>
              <label>
                Nombre visible
                <input name="name" required maxLength={80} defaultValue={edit.item?.name} />
              </label>
              <label>
                Rol
                <select aria-label="Rol" name="role" defaultValue={edit.item?.role || 'seguridad'}>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Contraseña {edit.item && <span className="optional">nueva, opcional</span>}
                <input
                  name="password"
                  type="password"
                  minLength={8}
                  maxLength={128}
                  required={!edit.item}
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                />
              </label>
            </>
          )}
          <label>
            Estado del registro
            <select aria-label="Estado del registro" name="active" defaultValue={edit.item?.active ?? 1}>
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </select>
          </label>
        </div>
        <p className="form-hint">
          Los registros se desactivan para conservar sus históricos. Los cambios de contraseña o permisos
          cierran las sesiones del usuario afectado.
        </p>
      </FormShell>
    </Modal>
  );
}
export function DetailModal({
  movement,
  onClose,
  onHistory,
}: {
  movement: Movement;
  onClose: () => void;
  onHistory: (row: Movement) => void;
}) {
  const result = useQuery<Movement>(`/movements/${movement.id}`, 0);
  const row = result.data;
  return (
    <Modal
      title={`Movimiento #${String(movement.id).padStart(5, '0')}`}
      subtitle="Información completa del registro"
      onClose={onClose}
    >
      <div className="form-content">
        <ErrorBox message={result.error} />
        {result.loading ? (
          <Loading />
        ) : (
          row && (
            <>
              <div className="detail-plate">
                {row.plate}
                <span>
                  {CATEGORY_LABELS[row.category]} · {row.type}
                </span>
              </div>
              <dl className="details">
                {Object.entries({
                  'Fecha y hora del movimiento': new Date(row.occurred_at).toLocaleString('es-MX', {
                    timeZone: 'America/Mexico_City',
                  }),
                  Acceso: row.access,
                  Estacionamiento: row.parking_name || 'No aplica',
                  Unidad: row.unit_code || 'No aplica',
                  Capturó: row.created_by_name,
                  'Fecha de captura': new Date(row.created_at).toLocaleString('es-MX', {
                    timeZone: 'America/Mexico_City',
                  }),
                  'Entrada vinculada': row.entry_id ? `#${row.entry_id}` : 'Este registro es una entrada',
                  'Salida vinculada': row.exit_at
                    ? new Date(row.exit_at).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })
                    : row.type === 'entrada'
                      ? 'Pendiente · vehículo dentro'
                      : 'Este registro es una salida',
                  ...(row.category === 'transporte'
                    ? { 'Estudiantes que abordan': row.boarded, 'Estudiantes que descienden': row.alighted }
                    : {}),
                  Observación: row.note || 'Sin observación',
                }).map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </>
          )
        )}
      </div>
      <div className="modal-footer">
        <button className="button secondary" onClick={onClose}>
          Cerrar
        </button>
        <button className="button primary" onClick={() => onHistory(movement)}>
          Historial de esta placa
        </button>
      </div>
    </Modal>
  );
}
