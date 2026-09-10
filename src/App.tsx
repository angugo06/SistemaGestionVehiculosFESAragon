import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  BusFront,
  CarFront,
  Check,
  CircleParking,
  Clock3,
  ArrowRight,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { Category, Filters, Movement, Overview, Unit, User } from '../shared/types';
import { ROLE_LABELS } from '../shared/types';
import { api, errorMessage, query, today, useQuery } from './lib';
import {
  DateRange,
  ErrorBox,
  ExportButton,
  FilterBar,
  Loading,
  Modal,
  MovementTable,
  Panel,
  Stat,
} from './components';
import { CatalogForm, DetailModal, MovementForm, StatusForm, type CatalogEdit } from './forms';
import Dashboard from './Dashboard';
import Brand from './layout/Brand';
import Login from './features/auth/Login';
import Transport from './features/transport/Transport';
import Security from './features/security/Security';
import Administration from './features/administration/Administration';

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
