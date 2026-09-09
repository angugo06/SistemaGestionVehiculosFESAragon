import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowUpDown,
  ArrowRight,
  BusFront,
  CarFront,
  CircleParking,
  ShieldCheck,
} from 'lucide-react';
import type { Movement, Overview } from '../shared/types';
import { Badge, MovementTable, Panel, Stat } from './components';
import { number } from './lib';

export default function Dashboard({
  data,
  onNavigate,
  onDetail,
}: {
  data: Overview;
  onNavigate: (page: string) => void;
  onDetail: (row: Movement) => void;
}) {
  const { dashboard: d, parkings, units } = data;
  const active = parkings.filter((p) => p.active);
  const capacity = active.reduce((sum, p) => sum + p.capacity, 0);
  const occupied = active.reduce((sum, p) => sum + p.occupied, 0);
  const percentage = capacity ? Math.round((occupied / capacity) * 100) : 0;
  const security = units.filter((u) => u.category === 'seguridad' && u.active);
  const hourly = d.hourly;
  const max = Math.max(4, ...hourly.map((h) => Math.max(h.entries, h.exits)));
  const x = (i: number) => 38 + i * 26.6;
  const y = (value: number) => 150 - (value / max) * 116;
  const points = (field: 'entries' | 'exits') => hourly.map((h, i) => `${x(i)},${y(h[field])}`).join(' ');
  const link = (page: string, text = 'Ver detalle') => (
    <button className="text-button with-icon" onClick={() => onNavigate(page)}>
      {text}
      <ArrowRight size={15} />
    </button>
  );
  return (
    <>
      <div className="stats-grid">
        <Stat
          label="Movimientos del periodo"
          value={d.entries + d.exits}
          foot={`${number(d.entries)} entradas · ${number(d.exits)} salidas`}
          icon={<ArrowUpDown size={20} />}
        />
        <Stat
          label="Vehículos dentro"
          value={d.inside}
          foot="Todas las categorías · estado actual"
          icon={<CarFront size={20} />}
        />
        <Stat
          label="Abordajes de estudiantes"
          value={d.boarded}
          foot={`${number(d.alighted)} descensos en el periodo`}
          icon={<BusFront size={20} />}
        />
        <Stat
          label="Unidades en ronda"
          value={`${security.filter((u) => u.status === 'en_ronda').length} / ${security.length}`}
          foot="Flota de seguridad activa · ahora"
          icon={<ShieldCheck size={20} />}
          tone="highlight"
        />
      </div>
      <div className="dashboard-top">
        <Panel
          title="Flujo vehicular"
          subtitle="Entradas y salidas por hora del periodo seleccionado"
          action={
            <div className="chart-legend">
              <span>
                <i className="entry" />
                Entradas
              </span>
              <span>
                <i className="exit" />
                Salidas
              </span>
            </div>
          }
        >
          <div className="flow-summary">
            <span>
              <ArrowDownLeft size={17} />
              {number(d.entries)} <small>entradas</small>
            </span>
            <span>
              <ArrowUpRight size={17} />
              {number(d.exits)} <small>salidas</small>
            </span>
          </div>
          <div className="chart">
            <svg
              viewBox="0 0 690 188"
              role="img"
              aria-label={`Gráfica de movimientos por hora: ${d.entries} entradas y ${d.exits} salidas.`}
            >
              <defs>
                <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#759e64" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#759e64" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 1, 2, 3, 4].map((i) => (
                <g key={i}>
                  <line
                    x1="38"
                    x2="658"
                    y1={150 - i * 29}
                    y2={150 - i * 29}
                    stroke="#e8ebe5"
                    strokeDasharray="3 4"
                  />
                  <text x="25" y={154 - i * 29} textAnchor="end">
                    {Math.round((max * i) / 4)}
                  </text>
                </g>
              ))}
              <polygon points={`38,150 ${points('entries')} ${x(23)},150`} fill="url(#chart-fill)" />
              <polyline
                points={points('entries')}
                fill="none"
                stroke="#527b48"
                strokeWidth="2.8"
                strokeLinejoin="round"
              />
              <polyline
                points={points('exits')}
                fill="none"
                stroke="#b5a077"
                strokeWidth="2"
                strokeDasharray="5 4"
                strokeLinejoin="round"
              />
              {hourly.map((h, i) => (
                <g key={h.hour}>
                  <circle cx={x(i)} cy={y(h.entries)} r="5" fill="transparent">
                    <title>
                      {h.hour}: {h.entries} entradas y {h.exits} salidas
                    </title>
                  </circle>
                  {i % 3 === 0 && (
                    <text x={x(i)} y="177" textAnchor="middle">
                      {h.hour}
                    </text>
                  )}
                </g>
              ))}
            </svg>
          </div>
        </Panel>
        <section className="occupancy-feature">
          <div className="feature-heading">
            <span>
              <CircleParking size={19} /> Estacionamientos
            </span>
            <span className="live-light">
              <i />
              Ahora
            </span>
          </div>
          <div className="occupancy-numbers">
            <strong>
              {percentage}
              <span>%</span>
            </strong>
            <div>
              <b>{number(capacity - occupied)}</b>
              <span>espacios disponibles</span>
            </div>
          </div>
          <div className="parking-dots" aria-label={`${occupied} de ${capacity} espacios ocupados`}>
            {Array.from({ length: 50 }, (_, i) => (
              <i key={i} className={i < Math.round(percentage / 2) ? 'filled' : ''} />
            ))}
          </div>
          <div className="occupancy-footer">
            <span>
              {occupied} ocupados de {capacity}
            </span>
            <button aria-label="Ver estacionamientos" onClick={() => onNavigate('particulares')}>
              <ArrowRight size={18} />
            </button>
          </div>
        </section>
      </div>
      <div className="dashboard-bottom">
        <Panel
          title="Actividad reciente"
          subtitle="Últimos movimientos del periodo"
          action={link('particulares', 'Ver movimientos')}
        >
          <MovementTable compact rows={d.recent} onDetail={onDetail} />
        </Panel>
        <div className="side-panels">
          <Panel
            title="Ocupación por zona"
            subtitle="Disponibilidad actual"
            action={<CircleParking size={19} className="muted" />}
          >
            <div className="parking-list">
              {active.length ? (
                active.map((p) => (
                  <div key={p.id}>
                    <div className="parking-row">
                      <span>{p.name}</span>
                      <b>
                        {p.occupied}
                        <small> / {p.capacity}</small>
                      </b>
                    </div>
                    <div className="progress-track">
                      <i
                        className={p.occupied / p.capacity > 0.85 ? 'warning' : ''}
                        style={{ width: `${(p.occupied / p.capacity) * 100}%` }}
                      />
                    </div>
                    <small>{p.capacity - p.occupied} espacios libres</small>
                  </div>
                ))
              ) : (
                <p className="muted">Agrega un estacionamiento en Administración.</p>
              )}
            </div>
          </Panel>
          <Panel title="Seguridad escolar" action={link('seguridad')}>
            <div className="security-mini">
              {security.map((unit) => (
                <div key={unit.id}>
                  <span className="unit-icon">
                    <ShieldCheck size={16} />
                  </span>
                  <strong>{unit.code}</strong>
                  <Badge status={unit.status} />
                </div>
              ))}
              {!security.length && <p className="muted">No hay unidades activas.</p>}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
