import { useEffect, useState } from 'react';
import { Activity, Clock3, MapPin, RefreshCw, ShieldCheck } from 'lucide-react';
import type { Filters, History, Movement, Overview, Unit } from '../../../shared/types';
import { STATUS_LABELS } from '../../../shared/types';
import { Badge, Empty, ErrorBox, ExportButton, Loading, MovementTable, Paginated, Panel } from '../../components';
import { formatDate, formatTime, query, useQuery } from '../../lib';

export default function Security({
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

