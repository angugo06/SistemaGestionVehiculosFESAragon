# Manual de operación y guion de exposición

## Inicio y navegación

Ejecuta `INICIAR.cmd` o `pnpm dev` y abre http://localhost:3000. Selecciona un perfil de demostración e inicia sesión. La barra lateral contiene Vista general, Vehículos particulares, Transporte y Seguridad escolar; Administración aparece solo para el administrador.

El tablero distingue los indicadores del periodo de los datos actuales. Las entradas, salidas, abordajes y descensos corresponden al periodo seleccionado. Las plazas ocupadas, los vehículos dentro y los estados de seguridad reflejan la situación vigente.

## Vehículos particulares

1. Pulsa **Registrar movimiento** y selecciona **Particular**.
2. Deja **Entrada al campus**, captura una placa, el estacionamiento, el acceso y el horario. Guarda.
3. La ocupación aumenta inmediatamente. El registro aparece en la consulta del periodo correspondiente.
4. Para registrar una salida, pulsa **Salida del campus** y selecciona el vehículo con entrada abierta.
5. Al guardar, se libera la plaza y la entrada conserva su hora de salida vinculada.

La misma placa no puede estar dentro dos veces. No se permiten entradas en estacionamientos llenos. Una salida no puede preceder a la entrada. La captura puede ser posterior al evento real, pero el orden de los movimientos de una misma placa debe ser cronológico.

En Vehículos particulares, busca la placa y ajusta el periodo, el estacionamiento, el tipo y el horario. La flecha de la última columna abre el detalle. **Historial de esta placa** elimina el límite de fechas y conserva la placa seleccionada. **Actualmente dentro** muestra estancias abiertas sin filtros de fechas u horarios.

## Transporte

Las tarjetas presentan unidades activas, ruta ilustrativa, capacidad y actividad filtrada. Los totales muestran abordajes y descensos por separado.

En Registrar movimiento, selecciona Transporte y una unidad del catálogo. Registra únicamente los estudiantes que abordan o descienden en ese evento. Se aceptan enteros desde cero. No copies el conteo de la llegada en la salida si son los mismos estudiantes: los contadores se suman como eventos distintos.

La llegada y la salida de una unidad se vinculan igual que las de un particular, pero no ocupan plazas de estacionamiento.

## Seguridad escolar

Las tarjetas muestran el estado actual: Inactiva, En ronda, Atendiendo incidente o En mantenimiento. Selecciona **Actualizar estado**, elige uno diferente y registra una observación. La aplicación guarda el estado anterior, el nuevo, el responsable y la hora del servidor.

El historial se consulta por unidad, estado y fechas. La pestaña Entradas y salidas muestra los movimientos de acceso de las unidades. Un cambio de estado no crea automáticamente una entrada o salida: son hechos distintos.

## Usuarios y catálogos

| Rol           | Consulta y CSV | Captura de movimientos y estados | Catálogos, usuarios y bitácora |
| ------------- | -------------- | -------------------------------- | ------------------------------ |
| Administrador | Sí             | Sí                               | Sí                             |
| Seguridad     | Sí             | Sí                               | No                             |
| Directivo     | Sí             | No                               | No                             |

El administrador puede agregar y editar estacionamientos, unidades y usuarios. Para retirar un registro se marca Inactivo. Los históricos permanecen accesibles. No puede desactivarse un estacionamiento ocupado ni una unidad que siga dentro. Tampoco se puede reducir el aforo por debajo de los lugares ocupados ni retirar al último administrador activo.

Al editar un usuario, dejar la contraseña vacía conserva la actual. Cambiar la contraseña, modificar el rol o desactivar la cuenta revoca sus sesiones. El usuario afectado tendrá que volver a iniciar sesión.

## Reportes y respaldo

**Exportar CSV** descarga los registros que cumplen los filtros, incluidos los que están en otras páginas de la tabla. Puedes abrirlos en Excel, LibreOffice o un editor. Los movimientos exportan hora y fecha del campus; los históricos de estados y la bitácora identifican explícitamente sus instantes UTC.

Para respaldar, ejecuta `pnpm backup` en otra terminal. Encontrarás el archivo en `backups/`. Consulta el README para abrirlo mediante `DB_PATH`.

## Guion de exposición de ocho minutos

1. **Problema y alcance, un minuto.** Explica que el sistema centraliza accesos, ocupación, transporte y flota escolar. Aclara que los datos mostrados son ficticios.
2. **Vista general, un minuto.** Cambia de Hoy a 7 días y señala qué indicadores cambian y cuáles siguen mostrando la situación actual.
3. **Operación, dos minutos.** Registra `EXPO123`, comprueba su presencia y trata de registrarlo otra vez: el sistema debe rechazarlo. Registra su salida y consulta ambos eventos.
4. **Transporte, un minuto.** Muestra una unidad, su ruta y los conteos filtrados. Explica por qué abordajes no significa estudiantes únicos.
5. **Seguridad, un minuto.** Cambia una unidad a En ronda o Inactiva y muestra el historial con responsable y observación.
6. **Administración y roles, un minuto.** Muestra un catálogo y la bitácora. Cierra sesión y entra como Directivo para comprobar que desaparecen las acciones de escritura.
7. **Arquitectura y pruebas, un minuto.** Explica React → API → reglas de negocio → SQLite, persistencia local, contraseñas protegidas y pruebas automatizadas.

## Solución de problemas

- **Puerto ocupado:** cierra la otra instancia o define `$env:PORT = '3001'` antes de iniciar; abre el mismo puerto en el navegador.
- **Página sin servidor:** la terminal debe permanecer abierta. Reabre `INICIAR.cmd`.
- **Cambios del código no visibles:** usa `pnpm dev`, o ejecuta de nuevo `pnpm build` antes de `pnpm start`.
- **No aparece un movimiento:** revisa periodo, horario y categoría. La fecha del campus puede ser un día anterior a su fecha UTC.
- **No puedo registrar una salida:** la placa debe tener una entrada abierta en la categoría correcta.
- **No puedo desactivar una unidad o zona:** registra primero las salidas pendientes.
- **La cuenta dejó de funcionar:** un cambio de permisos, contraseña o estado cierra la sesión; solicita al administrador que revise la cuenta.
- **Demostración antigua:** los datos se crean solo al iniciar una base nueva. Usa 7 o 30 días para consultar el periodo original, o utiliza un archivo nuevo mediante `DB_PATH` para generar otro escenario sin borrar el anterior.
