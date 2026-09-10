import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import type { Audit, Filters, Overview, User } from '../../../shared/types';
import { CATEGORY_LABELS, ROLE_LABELS } from '../../../shared/types';
import { Empty, ErrorBox, ExportButton, Loading, Paginated, Panel } from '../../components';
import type { CatalogEdit } from '../../forms';
import { formatDate, formatTime, query, useQuery } from '../../lib';

export default function Administration({
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

