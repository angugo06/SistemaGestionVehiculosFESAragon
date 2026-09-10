import { ArrowDownLeft, ArrowUpRight, BusFront, MapPin } from 'lucide-react';
import type { Movement, Overview } from '../../../shared/types';
import { MovementTable, Stat } from '../../components';

export default function Transport({
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

