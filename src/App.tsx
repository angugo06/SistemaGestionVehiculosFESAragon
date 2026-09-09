import { useEffect, useState, type FormEvent } from 'react';
import {
  Activity,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  BusFront,
  CarFront,
  Check,
  CircleParking,
  Clock3,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  X,
  MapPin,
  LockKeyhole,
  Eye,
  EyeOff,
  Pencil,
  AlertTriangle,
} from 'lucide-react';
import type { Audit, Category, Filters, History, Movement, Overview, Unit, User } from '../shared/types';
import { CATEGORY_LABELS, ROLE_LABELS, STATUS_LABELS } from '../shared/types';
import { api, errorMessage, formatDate, formatTime, query, today, useQuery } from './lib';
import {
  Badge,
  DateRange,
  Empty,
  ErrorBox,
  ExportButton,
  FilterBar,
  Loading,
  Modal,
  MovementTable,
  Paginated,
  Panel,
  Stat,
} from './components';
import { CatalogForm, DetailModal, MovementForm, StatusForm, type CatalogEdit } from './forms';
import Dashboard from './Dashboard';

const pages = [
  {
    id: 'dashboard',
    label: 'Vista general',
    title: 'Una mirada a la movilidad.',
    subtitle: 'Toda la actividad del campus, en un solo lugar.',
    icon: LayoutDashboard,
  },
  {
    id: 'particulares',
    label: 'Vehículos particulares',
    title: 'Vehículos particulares',
    subtitle: 'Control de accesos, estacionamientos e historial de placas.',
    icon: CarFront,
  },
  {
    id: 'transporte',
    label: 'Transporte',
    title: 'Conectamos el campus.',
    subtitle: 'Unidades, recorridos y uso del transporte público e institucional.',
    icon: BusFront,
  },
  {
    id: 'seguridad',
    label: 'Seguridad escolar',
    title: 'Seguridad en movimiento.',
    subtitle: 'Estado operativo y seguimiento de la flota de seguridad.',
    icon: ShieldCheck,
  },
  {
    id: 'administracion',
    label: 'Administración',
    title: 'Todo en su lugar.',
    subtitle: 'Gestiona los catálogos, los accesos al sistema y la bitácora.',
    icon: Settings2,
  },
];

function Brand({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`brand ${dark ? 'brand-dark' : ''}`}>
      <span className="brand-mark">
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <path d="M5 32 18 7h4l13 25h-9l-6-13-6 13Z" fill="currentColor" />
          <path d="M17 28h6v4h-6z" fill="currentColor" />
        </svg>
      </span>
      <div>
        <strong>ARAGÓN</strong>
        <span>M O V I L I D A D</span>
      </div>
    </div>
  );
}

function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const config = useQuery<{ demo: boolean }>('/login-info', 0);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      onLogin(await api<User>('/login', 'POST', { username, password }));
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <div className="login-story">
        <Brand />
        <div className="login-message">
          <span className="eyebrow">
            <span /> FACULTAD DE ESTUDIOS SUPERIORES ARAGÓN
          </span>
          <h1>
            Un campus
            <br />
            en movimiento.
            <br />
            <em>Todo bajo control.</em>
          </h1>
          <p>Una visión compartida de los accesos, el transporte y la seguridad de nuestra comunidad.</p>
          <div className="campus-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="campus-road" />
            <div className="campus-building">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="art-label art-label-a">
              <CarFront size={18} />
              <span>Accesos conectados</span>
              <i />
            </div>
            <div className="art-label art-label-b">
              <ShieldCheck size={18} />
              <span>Campus seguro</span>
              <Check size={14} />
            </div>
            <div className="art-pin">
              <MapPin size={22} />
            </div>
          </div>
        </div>
        <span className="login-bottom">
          UNAM · FES ARAGÓN <span>Proyecto académico</span>
        </span>
      </div>
      <div className="login-form-side">
        <span className="login-top-note">
          <LockKeyhole size={14} /> Acceso para personal autorizado
        </span>
        <form onSubmit={submit} className="login-form">
          <span className="eyebrow dark">BIENVENIDO A MOVILIDAD</span>
          <h2>Tu campus, al día.</h2>
          <p>
            Inicia sesión para consultar y gestionar
            <br className="desktop-only" /> la actividad vehicular de la Facultad.
          </p>
          <ErrorBox message={error} />
          <label>
            Usuario
            <input
              autoFocus
              name="username"
              autoComplete="username"
              required
              placeholder="Escribe tu usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label>
            Contraseña
            <div className="password-field">
              <input
                name="password"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                required
                placeholder="Escribe tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onClick={() => setShow(!show)}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          <button className="button primary login-submit" disabled={busy}>
            {busy ? 'Iniciando sesión…' : 'Entrar al sistema'}
            <ArrowRight size={18} />
          </button>
          {config.data?.demo && (
            <div className="demo-access">
              <span>EXPLORA LA DEMOSTRACIÓN</span>
              <p>Elige un perfil para completar las credenciales.</p>
              <div>
                {[
                  ['admin', 'Administrador'],
                  ['seguridad', 'Seguridad'],
                  ['direccion', 'Directivo'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setUsername(value);
                      setPassword('Aragon2026!');
                      setError('');
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <small>
                Datos ficticios · Contraseña: <code>Aragon2026!</code>
              </small>
            </div>
          )}
        </form>
        <span className="login-privacy">
          Solo se registra información necesaria para la operación vehicular.
        </span>
      </div>
    </div>
  );
}

function Transport({
  data,
  rows,
  onDetail,
}: {
  data: Overview;
  rows: Movement[];
  onDetail: (row: Movement) => void;
}) {
  const boarded = rows.reduce((sum, row) => sum + row.boarded, 0);
  const alighted = rows.reduce((sum, row) => sum + row.alighted, 0);
  const units = data.units.filter((u) => u.category === 'transporte' && u.active);
  return (
    <>
      <div className="stats-grid three">
        <Stat
          label="Abordajes registrados"
          value={boarded}
          foot="Total según los filtros de consulta"
          icon={<ArrowUpRight size={20} />}
        />
        <Stat
          label="Descensos registrados"
          value={alighted}
          foot="Total según los filtros de consulta"
          icon={<ArrowDownLeft size={20} />}
        />
        <Stat
          label="Unidades disponibles"
          value={units.length}
          foot="Unidades activas en el catálogo actual"
          icon={<BusFront size={20} />}
          tone="highlight"
        />
      </div>
      <div className="unit-cards transport-cards">
        {units.map((unit) => {
          const activity = rows.filter((row) => row.unit_id === unit.id);
          return (
            <section className="unit-card" key={unit.id}>
              <div className="unit-card-top">
                <span className="large-unit-icon">
                  <BusFront size={23} />
                </span>
                <span className="badge en_ronda">
                  <i />
                  Activa
                </span>
              </div>
              <h3>{unit.code}</h3>
              <span className="unit-plate">
                {unit.plate} · {unit.capacity} pasajeros
              </span>
              <p>
                <MapPin size={14} />
                {unit.route || 'Ruta sin asignar'}
              </p>
              <div className="unit-card-footer">
                <span>
                  <strong>{activity.filter((r) => r.type === 'entrada').length}</strong> llegadas filtradas
                </span>
                <span>
                  <strong>{activity.reduce((sum, r) => sum + r.boarded, 0)}</strong> abordajes
                </span>
              </div>
            </section>
          );
        })}
      </div>
      <MovementTable rows={rows} onDetail={onDetail} transport />
    </>
  );
}

function Security({
  data,
  filters,
  revision,
  operator,
  onStatus,
  onDetail,
  onFilters,
}: {
  data: Overview;
  filters: Filters;
  revision: number;
  operator: boolean;
  onStatus: (unit: Unit) => void;
  onDetail: (row: Movement) => void;
  onFilters: (f: Filters) => void;
}) {
  const [tab, setTab] = useState('history');
  useEffect(() => {
    if (filters.plate) setTab('movements');
  }, [filters.plate]);
  const history = useQuery<History[]>(
    tab === 'history'
      ? `/security/history?${query({ from: filters.from, to: filters.to, unit: filters.unit, status: filters.status })}`
      : null,
    revision,
  );
  const movements = useQuery<Movement[]>(
    tab === 'movements'
      ? `/movements?${query({ ...filters, status: undefined, category: 'seguridad' })}`
      : null,
    revision,
  );
  const units = data.units.filter(
    (u) =>
      u.category === 'seguridad' &&
      u.active &&
      (!filters.unit || u.id === Number(filters.unit)) &&
      (!filters.status || u.status === filters.status),
  );
  return (
    <>
      <div className="section-note">
        <Activity size={15} /> Las tarjetas muestran el estado actual. Las fechas filtran el historial y los
        movimientos.
      </div>
      <div className="unit-cards security-cards">
        {units.map((unit) => (
          <section className="unit-card" key={unit.id}>
            <div className="unit-card-top">
              <span className={`large-unit-icon ${unit.status}`}>
                <ShieldCheck size={23} />
              </span>
              <Badge status={unit.status} />
            </div>
            <h3>{unit.code}</h3>
            <span className="unit-plate">{unit.plate}</span>
            <p>
              <MapPin size={14} />
              {unit.route || 'Zona sin asignar'}
            </p>
            <div className="unit-update">
              <Clock3 size={13} />
              {formatDate(unit.updated_at)} · {formatTime(unit.updated_at)}
            </div>
            {operator && (
              <button className="button secondary full-width" onClick={() => onStatus(unit)}>
                <RefreshCw size={15} />
                Actualizar estado
              </button>
            )}
          </section>
        ))}
      </div>
      {!units.length && (
        <Empty
          title="No hay unidades con estos criterios"
          text="Cambia el estado o la unidad seleccionada."
        />
      )}
      <Panel
        title="Seguimiento de unidades"
        action={
          <ExportButton
            kind={tab === 'history' ? 'security' : 'movements'}
            filters={
              tab === 'history'
                ? { from: filters.from, to: filters.to, unit: filters.unit, status: filters.status }
                : { ...filters, status: undefined, category: 'seguridad' }
            }
          />
        }
      >
        <div className="tabs">
          <button className={tab === 'history' ? 'selected' : ''} onClick={() => setTab('history')}>
            Historial de estados
          </button>
          <button
            className={tab === 'movements' ? 'selected' : ''}
            onClick={() => {
              setTab('movements');
              onFilters({ ...filters, status: '' });
            }}
          >
            Entradas y salidas
          </button>
        </div>
        {tab === 'history' ? (
          <>
            <ErrorBox message={history.error} />
            {history.loading ? (
              <Loading />
            ) : history.data?.length ? (
              <Paginated rows={history.data}>
                {(visible) => (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Unidad</th>
                          <th>Cambio de estado</th>
                          <th>Fecha y hora</th>
                          <th>Responsable / observación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visible.map((row) => (
                          <tr key={row.id}>
                            <td>
                              <strong>{row.unit_code}</strong>
                            </td>
                            <td>
                              <small>
                                {row.previous_status ? STATUS_LABELS[row.previous_status] : 'Alta de unidad'}{' '}
                                →
                              </small>
                              <Badge status={row.status} />
                            </td>
                            <td>
                              {formatTime(row.occurred_at)}
                              <small>{formatDate(row.occurred_at)}</small>
                            </td>
                            <td>
                              <span>{row.username}</span>
                              <small className="note-cell">{row.note || 'Sin observación'}</small>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Paginated>
            ) : (
              <Empty />
            )}
          </>
        ) : (
          <>
            <ErrorBox message={movements.error} />
            {movements.loading ? (
              <Loading />
            ) : (
              <MovementTable rows={movements.data || []} onDetail={onDetail} />
            )}
          </>
        )}
      </Panel>
    </>
  );
}

function Administration({
  data,
  revision,
  filters,
  onEdit,
}: {
  data: Overview;
  revision: number;
  filters: Filters;
  onEdit: (edit: CatalogEdit) => void;
}) {
  const [tab, setTab] = useState<'parkings' | 'units' | 'users' | 'audit'>('parkings');
  const users = useQuery<User[]>(tab === 'users' ? '/users' : null, revision);
  const audit = useQuery<Audit[]>(
    tab === 'audit' ? `/audit?${query({ from: filters.from, to: filters.to })}` : null,
    revision,
  );
  const actions =
    tab === 'audit' ? (
      <ExportButton kind="audit" filters={{ from: filters.from, to: filters.to }} />
    ) : (
      <button
        className="button primary"
        onClick={() => {
          if (tab === 'parkings') onEdit({ kind: 'parkings' });
          else if (tab === 'units') onEdit({ kind: 'units' });
          else onEdit({ kind: 'users' });
        }}
      >
        <Plus size={16} />
        Agregar {tab === 'parkings' ? 'estacionamiento' : tab === 'units' ? 'unidad' : 'usuario'}
      </button>
    );
  return (
    <Panel
      title="Administración del sistema"
      subtitle={
        tab === 'audit'
          ? 'Acciones registradas en el periodo seleccionado'
          : 'Catálogos actuales · las fechas no limitan esta lista'
      }
      action={actions}
    >
      <div className="tabs">
        {[
          ['parkings', 'Estacionamientos'],
          ['units', 'Unidades'],
          ['users', 'Usuarios'],
          ['audit', 'Bitácora'],
        ].map(([value, label]) => (
          <button
            key={value}
            className={tab === value ? 'selected' : ''}
            onClick={() => setTab(value as typeof tab)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'parkings' &&
        (data.parkings.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Estacionamiento</th>
                  <th>Capacidad</th>
                  <th>Ocupación actual</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.parkings.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                    </td>
                    <td>{item.capacity} espacios</td>
                    <td>
                      {item.occupied} ocupados · {item.capacity - item.occupied} libres
                    </td>
                    <td>
                      <span className={`badge ${item.active ? 'en_ronda' : 'inactivo'}`}>
                        {item.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <button className="button ghost" onClick={() => onEdit({ kind: 'parkings', item })}>
                        <Pencil size={14} />
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Agrega el primer estacionamiento"
            text="Define su nombre y capacidad para comenzar a registrar accesos."
          />
        ))}
      {tab === 'units' &&
        (data.units.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Unidad</th>
                  <th>Categoría</th>
                  <th>Ruta / zona</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.units.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.code}</strong>
                      <small>{item.plate}</small>
                    </td>
                    <td>{CATEGORY_LABELS[item.category]}</td>
                    <td>{item.route || 'Sin asignar'}</td>
                    <td>
                      <span className={`badge ${item.active ? 'en_ronda' : 'inactivo'}`}>
                        {item.active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td>
                      <button className="button ghost" onClick={() => onEdit({ kind: 'units', item })}>
                        <Pencil size={14} />
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Todavía no hay unidades"
            text="Agrega transporte y vehículos de seguridad desde este catálogo."
          />
        ))}
      {tab === 'users' && (
        <>
          <ErrorBox message={users.error} />
          {users.loading ? (
            <Loading />
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Nombre</th>
                    <th>Rol</th>
                    <th>Cuenta</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.data?.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.username}</strong>
                        {item.id === data.user.id && <small>Tu cuenta</small>}
                      </td>
                      <td>{item.name}</td>
                      <td>{ROLE_LABELS[item.role]}</td>
                      <td>
                        <span className={`badge ${item.active ? 'en_ronda' : 'inactivo'}`}>
                          {item.active ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td>
                        <button className="button ghost" onClick={() => onEdit({ kind: 'users', item })}>
                          <Pencil size={14} />
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {tab === 'audit' && (
        <>
          <ErrorBox message={audit.error} />
          {audit.loading ? (
            <Loading />
          ) : audit.data?.length ? (
            <Paginated rows={audit.data}>
              {(visible) => (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Acción</th>
                        <th>Usuario</th>
                        <th>Fecha y hora</th>
                        <th>Registro / detalle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <strong>{row.action}</strong>
                            <small>#{row.id}</small>
                          </td>
                          <td>{row.username}</td>
                          <td>
                            {formatTime(row.occurred_at)}
                            <small>{formatDate(row.occurred_at)}</small>
                          </td>
                          <td>
                            <span>
                              {row.entity} #{row.entity_id}
                            </span>
                            <small className="note-cell">{row.detail || 'Sin detalle adicional'}</small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Paginated>
          ) : (
            <Empty />
          )}
        </>
      )}
    </Panel>
  );
}

function Workspace({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [page, setPage] = useState(() =>
    pages.some((p) => p.id === location.hash.slice(1)) ? location.hash.slice(1) : 'dashboard',
  );
  const [filters, setFilters] = useState<Filters>({ from: today(), to: today() });
  const [revision, setRevision] = useState(0);
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState('');
  const [globalError, setGlobalError] = useState('');
  const [newMovement, setNewMovement] = useState(false);
  const [statusUnit, setStatusUnit] = useState<Unit | null>(null);
  const [catalog, setCatalog] = useState<CatalogEdit | null>(null);
  const [detail, setDetail] = useState<Movement | null>(null);
  const [help, setHelp] = useState(false);
  const [presentOnly, setPresentOnly] = useState(false);
  const overview = useQuery<Overview>(`/overview?${query({ from: filters.from, to: filters.to })}`, revision);
  const category: Category =
    page === 'transporte' ? 'transporte' : page === 'seguridad' ? 'seguridad' : 'particular';
  const movementFilters = { ...filters, status: undefined, category };
  const movements = useQuery<Movement[]>(
    page === 'particulares' || page === 'transporte'
      ? presentOnly && page === 'particulares'
        ? '/presence'
        : `/movements?${query(movementFilters)}`
      : null,
    revision,
  );
  const currentUser = overview.data?.user || user;
  const operator = currentUser.role !== 'directivo';
  function navigate(next: string) {
    setPage(next);
    location.hash = next;
    setFilters({ from: today(), to: today() });
    setPresentOnly(false);
    setMenu(false);
  }
  useEffect(() => {
    const changed = () => {
      const next = location.hash.slice(1);
      if (pages.some((p) => p.id === next)) setPage(next);
    };
    window.addEventListener('hashchange', changed);
    return () => window.removeEventListener('hashchange', changed);
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setRevision((value) => value + 1), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 5500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (currentUser.role !== 'administrador' && page === 'administracion') {
      setPage('dashboard');
      location.hash = 'dashboard';
    }
  }, [currentUser.role, page]);
  function saved(message: string) {
    setNewMovement(false);
    setStatusUnit(null);
    setCatalog(null);
    setToast(message);
    setRevision((value) => value + 1);
  }
  async function logout() {
    try {
      await api('/logout', 'POST');
      onLogout();
    } catch (error) {
      setGlobalError(errorMessage(error));
    }
  }
  const pageInfo = pages.find((p) => p.id === page) || pages[0];
  const data = overview.data;
  const displayedRows =
    presentOnly && page === 'particulares'
      ? (movements.data || []).filter(
          (row) =>
            row.category === 'particular' &&
            (!filters.plate || row.plate.includes(filters.plate.toUpperCase().replace(/[\s-]/g, ''))) &&
            (!filters.parking || row.parking_id === Number(filters.parking)),
        )
      : movements.data || [];
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Saltar al contenido
      </a>
      {menu && (
        <button className="sidebar-backdrop" aria-label="Cerrar navegación" onClick={() => setMenu(false)} />
      )}
      <aside className={`sidebar ${menu ? 'open' : ''}`}>
        <Brand />
        <span className="workspace-label">CENTRO DE MOVILIDAD</span>
        <nav aria-label="Navegación principal">
          {pages
            .filter((p) => p.id !== 'administracion' || currentUser.role === 'administrador')
            .map((p) => (
              <button
                key={p.id}
                className={page === p.id ? 'active' : ''}
                aria-current={page === p.id ? 'page' : undefined}
                onClick={() => navigate(p.id)}
              >
                <p.icon size={19} />
                <span>{p.label}</span>
                {page === p.id && <i />}
              </button>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="campus-card">
            <span className="campus-monogram">FA</span>
            <div>
              <strong>FES Aragón</strong>
              <span>
                Universidad Nacional
                <br />
                Autónoma de México
              </span>
            </div>
            <div className="campus-status">
              <i />
              Operación local
            </div>
          </div>
          <button
            className="help-button"
            onClick={() => {
              setHelp(true);
              setMenu(false);
            }}
          >
            <BookOpen size={18} />
            Guía de uso
            <ArrowRight size={15} />
          </button>
          <div className="sidebar-version">
            MOVILIDAD 1.0<span>HECHO PARA EL CAMPUS</span>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button menu-toggle"
              aria-label="Abrir navegación"
              onClick={() => setMenu(!menu)}
            >
              <Menu size={21} />
            </button>
            <span>Centro de movilidad</span>
            <span>/</span>
            <strong>{pageInfo.label}</strong>
          </div>
          <div className="topbar-right">
            <span className="system-status">
              <i />
              Sistema local
            </span>
            <div className="user-info">
              <span className="avatar">{currentUser.name.slice(0, 2).toUpperCase()}</span>
              <div>
                <strong>{currentUser.name}</strong>
                <small>{ROLE_LABELS[currentUser.role]}</small>
              </div>
              <button
                className="icon-button"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
                onClick={logout}
              >
                <LogOut size={17} />
              </button>
            </div>
          </div>
        </header>
        <main id="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow dark">
                <span />{' '}
                {new Intl.DateTimeFormat('es-MX', {
                  timeZone: 'America/Mexico_City',
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                }).format(new Date())}
              </div>
              <h1>{pageInfo.title}</h1>
              <p>{pageInfo.subtitle}</p>
            </div>
            {operator && (
              <button
                className="button primary new-movement"
                onClick={() => setNewMovement(true)}
                disabled={!data}
              >
                <Plus size={18} />
                Registrar movimiento
              </button>
            )}
          </div>
          <div className="page-toolbar">
            <DateRange filters={filters} onChange={setFilters} />
            <div className="toolbar-end">
              {data?.demo && <span className="demo-pill">Datos de demostración</span>}
              <button
                className="icon-button refresh"
                aria-label="Actualizar información"
                title="Actualizar información"
                onClick={() => setRevision((value) => value + 1)}
              >
                <RefreshCw size={16} className={overview.loading ? 'spin' : ''} />
              </button>
            </div>
          </div>
          {data?.demo && (
            <p className="demo-note">
              Escenario ficticio para uso académico. Rutas, unidades y capacidades de ejemplo.
            </p>
          )}
          <ErrorBox message={globalError || overview.error} />
          {!data && overview.loading ? (
            <Loading />
          ) : (
            data && (
              <>
                {page === 'dashboard' && <Dashboard data={data} onNavigate={navigate} onDetail={setDetail} />}
                {(page === 'particulares' || page === 'transporte') && (
                  <>
                    {page === 'particulares' && (
                      <div className="stats-grid three">
                        <Stat
                          label="Particulares dentro"
                          value={data.parkings.reduce((sum, p) => sum + p.occupied, 0)}
                          foot="Ocupación actual de estacionamientos"
                          icon={<CarFront size={20} />}
                        />
                        <Stat
                          label="Espacios disponibles"
                          value={data.parkings
                            .filter((p) => p.active)
                            .reduce((sum, p) => sum + p.capacity - p.occupied, 0)}
                          foot="En todos los estacionamientos activos"
                          icon={<CircleParking size={20} />}
                          tone="highlight"
                        />
                        <Stat
                          label="Zonas de estacionamiento"
                          value={data.parkings.filter((p) => p.active).length}
                          foot="Estacionamientos activos del campus"
                          icon={<MapPin size={20} />}
                        />
                      </div>
                    )}
                    <Panel
                      title={page === 'transporte' ? 'Actividad de transporte' : 'Registro de accesos'}
                      subtitle={
                        presentOnly
                          ? 'Vehículos con entrada abierta · no se aplican fechas ni horarios'
                          : 'Consulta los movimientos según el periodo y los filtros'
                      }
                      action={!presentOnly && <ExportButton filters={movementFilters} />}
                    >
                      {page === 'particulares' && (
                        <div className="tabs">
                          <button
                            className={!presentOnly ? 'selected' : ''}
                            onClick={() => setPresentOnly(false)}
                          >
                            Todos los movimientos
                          </button>
                          <button
                            className={presentOnly ? 'selected' : ''}
                            onClick={() => {
                              setPresentOnly(true);
                              setFilters({ from: filters.from, to: filters.to });
                            }}
                          >
                            Actualmente dentro
                          </button>
                        </div>
                      )}
                      <FilterBar
                        filters={filters}
                        onChange={setFilters}
                        parkings={data.parkings}
                        units={data.units}
                        category={category}
                        presentOnly={presentOnly}
                      />
                      <ErrorBox message={movements.error} />
                      {movements.loading ? (
                        <Loading />
                      ) : page === 'transporte' ? (
                        <Transport data={data} rows={displayedRows} onDetail={setDetail} />
                      ) : (
                        <MovementTable rows={displayedRows} onDetail={setDetail} />
                      )}
                    </Panel>
                  </>
                )}
                {page === 'seguridad' && (
                  <>
                    <FilterBar
                      filters={filters}
                      onChange={setFilters}
                      parkings={data.parkings}
                      units={data.units}
                      category="seguridad"
                      security
                    />
                    <Security
                      data={data}
                      filters={filters}
                      revision={revision}
                      operator={operator}
                      onStatus={setStatusUnit}
                      onDetail={setDetail}
                      onFilters={setFilters}
                    />
                  </>
                )}
                {page === 'administracion' && currentUser.role === 'administrador' && (
                  <Administration data={data} filters={filters} revision={revision} onEdit={setCatalog} />
                )}
              </>
            )
          )}
          <footer className="page-footer">
            <span>FES Aragón · Sistema de gestión vehicular</span>
            <span>
              <Clock3 size={12} />
              Hora de Ciudad de México · Actualización cada minuto
            </span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <span>
            <Check size={18} />
          </span>
          {toast}
          <button aria-label="Cerrar notificación" onClick={() => setToast('')}>
            <X size={16} />
          </button>
        </div>
      )}
      {newMovement && data && (
        <MovementForm
          data={data}
          initialCategory={category}
          onClose={() => setNewMovement(false)}
          onSaved={saved}
        />
      )}
      {statusUnit && <StatusForm unit={statusUnit} onClose={() => setStatusUnit(null)} onSaved={saved} />}
      {catalog && <CatalogForm edit={catalog} onClose={() => setCatalog(null)} onSaved={saved} />}
      {detail && (
        <DetailModal
          movement={detail}
          onClose={() => setDetail(null)}
          onHistory={(row) => {
            const next = row.category === 'particular' ? 'particulares' : row.category;
            navigate(next);
            setFilters({ from: '', to: '', plate: row.plate, unit: row.unit_id ? String(row.unit_id) : '' });
            setDetail(null);
          }}
        />
      )}
      {help && (
        <Modal
          title="Tu guía de movilidad"
          subtitle="Una operación diaria sencilla y trazable."
          onClose={() => setHelp(false)}
          wide
        >
          <div className="form-content help-content">
            <div>
              <span>01</span>
              <section>
                <h3>Registra una entrada o salida</h3>
                <p>
                  Usa “Registrar movimiento”, elige la categoría y captura el acceso. Para salir, selecciona
                  una entrada abierta. No se permiten entradas duplicadas ni estacionamientos por encima de su
                  capacidad.
                </p>
              </section>
            </div>
            <div>
              <span>02</span>
              <section>
                <h3>Consulta y comparte los registros</h3>
                <p>
                  Selecciona un periodo y filtra por placa, unidad, estacionamiento u horario. Abre la flecha
                  de un registro para ver el detalle y su historial. “Exportar CSV” descarga los resultados
                  filtrados para abrirlos en Excel.
                </p>
              </section>
            </div>
            <div>
              <span>03</span>
              <section>
                <h3>Da seguimiento a seguridad y transporte</h3>
                <p>
                  Cada cambio de estado guarda responsable y observación. Los conteos de transporte son
                  abordajes y descensos, no estudiantes únicos. La ocupación y los estados vigentes siempre
                  muestran la situación actual.
                </p>
              </section>
            </div>
            <div>
              <span>04</span>
              <section>
                <h3>Cada perfil tiene sus permisos</h3>
                <p>
                  Seguridad captura y consulta. Dirección solo consulta y exporta. Administración también
                  mantiene catálogos, usuarios y bitácora. Desactiva registros para conservar el historial.
                </p>
              </section>
            </div>
            <div className="help-note">
              <AlertTriangle size={18} />
              <p>
                Los datos se guardan en este equipo. Consulta el README para realizar respaldos y ejecutar la
                aplicación sin datos de demostración.
              </p>
            </div>
          </div>
          <div className="modal-footer">
            <button className="button primary" onClick={() => setHelp(false)}>
              Entendido
              <Check size={16} />
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    api<User>('/me')
      .then((value) => {
        if (active) setUser(value);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    const expired = () => setUser(null);
    window.addEventListener('session-expired', expired);
    return () => {
      active = false;
      window.removeEventListener('session-expired', expired);
    };
  }, []);
  if (loading)
    return (
      <div className="boot-screen">
        <Brand dark />
        <Loading />
      </div>
    );
  return user ? (
    <Workspace
      user={user}
      onLogout={() => {
        setUser(null);
        location.hash = '';
      }}
    />
  ) : (
    <Login onLogin={setUser} />
  );
}
