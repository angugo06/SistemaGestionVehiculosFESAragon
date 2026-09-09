# Matriz de requisitos

Fuente: documento proporcionado por el usuario, **Especificacion_Requisitos_Sistema_Vehicular_FES_Aragon.docx**. Se tomó como especificación del producto. La solicitud del usuario define la ejecución local sencilla y la documentación y comentarios en español.

## Requisitos funcionales

| ID                             | Implementación                                                         | Verificación                    |
| ------------------------------ | ---------------------------------------------------------------------- | ------------------------------- |
| RF-01 Inicio de sesión         | Credenciales, cookie de sesión, vencimiento y revocación               | API y navegador                 |
| RF-02 Registro de movimiento   | Entrada/salida con placa, categoría, acceso, fecha y hora              | Dominio, API y navegador        |
| RF-03 Clasificación            | Particular, transporte y seguridad; unidad validada en catálogo        | Dominio y API                   |
| RF-04 Estacionamiento          | Capacidad administrable y ocupación derivada de estancias abiertas     | Dominio y navegador             |
| RF-05 Consulta de particulares | Tabla, placa, fechas, horario, tipo y estacionamiento                  | Dominio y navegador             |
| RF-06 Transporte               | Unidad, llegada/salida y conteos de abordajes/descensos                | Dominio y navegador             |
| RF-07 Estado de seguridad      | Inactivo, en ronda, incidente y mantenimiento                          | Dominio y navegador             |
| RF-08 Historial de seguridad   | Historial de estados y consulta de movimientos                         | Dominio y navegador             |
| RF-09 Dashboard                | Indicadores, gráfica horaria, aforo, unidades y actividad              | Dominio y revisión de navegador |
| RF-10 Filtros                  | Fechas y campos relevantes por módulo                                  | Dominio, API y navegador        |
| RF-11 Detalle                  | Diálogo con datos completos, capturista, enlaces e historial por placa | Navegador                       |
| RF-12 Reportes                 | CSV de movimientos y estados; exportación de bitácora                  | API y navegador                 |
| RF-13 Bitácora                 | Responsable, fecha y acción en escrituras y sesiones                   | Dominio, API y navegador        |
| RF-14 Catálogos                | Estacionamientos, unidades y usuarios; altas, edición y desactivación  | Dominio, API y navegador        |

## Requisitos no funcionales

| ID                    | Solución y límite                                                                                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RNF-01 Seguridad      | Roles en servidor, scrypt con sal, cookie HttpOnly, revocación y protección de escrituras. Verificación automatizada; no equivale a una auditoría de producción. |
| RNF-02 Privacidad     | No se solicita nombre del conductor, matrícula estudiantil, teléfono ni datos de pasajeros. Las observaciones piden evitar información personal.                 |
| RNF-03 Usabilidad     | Navegación consistente, formularios guiados, filtros, guía, confirmaciones, estados vacíos y adaptación a móvil.                                                 |
| RNF-04 Rendimiento    | Consultas locales con índices; medición de demostración documentada en VALIDACION.md. No se afirma rendimiento con carga institucional.                          |
| RNF-05 Disponibilidad | Archivo SQLite persistente; prueba de cierre/reapertura y respaldo consistente.                                                                                  |
| RNF-06 Integridad     | Salida vinculada a una entrada abierta, aforo y unicidad en transacciones.                                                                                       |
| RNF-07 Compatibilidad | Interfaz web estándar; validación automatizada en Chromium de escritorio y viewport móvil. Firefox y Safari no se han verificado.                                |
| RNF-08 Mantenibilidad | Interfaz, servicio de dominio, validadores, API y adaptador de datos separados; TypeScript estricto.                                                             |

## Criterios de aceptación

| ID    | Recorrido esperado                                                                                               |
| ----- | ---------------------------------------------------------------------------------------------------------------- |
| CA-01 | Registrar entrada particular crea evento y aumenta ocupación.                                                    |
| CA-02 | Registrar salida vincula entrada, guarda horario y libera plaza.                                                 |
| CA-03 | Una escritura vuelve a consultar el resumen y los módulos; actualización periódica cada minuto.                  |
| CA-04 | Un cambio de estado actualiza tarjeta y conserva transición anterior y responsable.                              |
| CA-05 | Los conteos de transporte se suman en el periodo del evento.                                                     |
| CA-06 | Los resultados respetan fechas del campus, categoría y otros filtros.                                            |
| CA-07 | Seguridad y directivo reciben HTTP 403 al intentar administrar; las acciones tampoco se muestran en su interfaz. |

## Mejoras incluidas

Se incorporaron exportación de bitácora, respaldo por comando, cuentas de demostración por rol, una base vacía configurable, mensajes de validación, normalización de placas, revocación de sesiones, detalle de captura frente a fecha del evento, protección del último administrador, soporte de teclado, versión móvil y un guion de exposición.

## Alcance excluido

No hay reconocimiento automático de placas, GPS en tiempo real, control físico de accesos ni aplicación móvil nativa. No se inventaron servicios institucionales existentes: los nombres de rutas y catálogos de demostración son ilustrativos. La regla de no duplicar entradas se aplica sin excepción; no se agregó un proceso de corrección retroactiva o borrado de movimientos.
