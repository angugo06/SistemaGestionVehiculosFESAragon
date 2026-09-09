# Evidencia de validación

Validación realizada el **8 de septiembre de 2026**, hora de Ciudad de México, en Windows con Node.js **26.5.1** y pnpm **11.24.0**. Los recorridos usan datos ficticios y bases independientes de la base principal.

## Comprobaciones automáticas

| Comprobación            | Resultado                                                         |
| ----------------------- | ----------------------------------------------------------------- |
| `pnpm lint`             | Sin errores ni advertencias de código                             |
| `pnpm typecheck`        | TypeScript estricto sin errores                                   |
| `pnpm test`             | 13 pruebas aprobadas, 0 fallidas                                  |
| `pnpm build`            | Compilación de interfaz y verificación de tipos aprobadas         |
| `pnpm test:e2e`         | 4 recorridos completos aprobados en Chromium                      |
| `pnpm test:performance` | 150 solicitudes locales aprobadas; todas por debajo de 3 segundos |

Los cuatro recorridos de navegador comprueban:

1. Entrada y salida particular, detalle con salida vinculada y CSV limitado a la placa filtrada.
2. Llegada de transporte con conteo de estudiantes, cambio de estado de seguridad y persistencia después de recargar.
3. Alta de estacionamiento y usuario, bitácora y ausencia de controles de escritura para directivos.
4. Navegación a 390 × 844, ausencia de desbordamiento horizontal de página, estado vacío y cierre del diálogo con Escape.

Las pruebas de API verifican adicionalmente HTTP 401/403, protección de origen y cabecera de escritura, sesiones HttpOnly, revocación al desactivar usuarios, límite de intentos fallidos, validación, dos entradas simultáneas para la misma placa y reportes filtrados. Las pruebas de dominio comprueban aforo, orden temporal, vinculación de salidas, restricciones de catálogos, historial, conteos y reapertura de un archivo SQLite.

Se verificaron también el arranque de desarrollo con una base vacía, una contraseña inicial propia y el lanzador de Windows de principio a fin. El respaldo de la base activa se reabrió con **621 movimientos y 47 estancias abiertas**; `PRAGMA quick_check` devolvió `ok`.

## Medición local de consultas

Base de **621 movimientos ficticios**, 30 solicitudes secuenciales por consulta. La medición incluye el viaje HTTP local y la lectura completa de la respuesta, después de iniciar sesión. No mide el renderizado del navegador ni simula usuarios simultáneos de un campus real.

| Consulta                 | Mediana  | Percentil 95 | Máximo    |
| ------------------------ | -------- | ------------ | --------- |
| Dashboard                | 5.89 ms  | 9.70 ms      | 12.45 ms  |
| Particulares del día     | 0.99 ms  | 1.48 ms      | 2.29 ms   |
| Todos los movimientos    | 2.56 ms  | 3.66 ms      | 3.74 ms   |
| Historial de seguridad   | 0.52 ms  | 0.83 ms      | 0.90 ms   |
| Exportación CSV completa | 51.87 ms | 69.56 ms     | 366.28 ms |

El comando reproducible es `pnpm test:performance`. Cada ejecución crea una base temporal y escribe sus resultados en `artifacts/performance.json`. Los tiempos dependen del equipo, volumen y carga del sistema.

## Revisión visual

Se inspeccionaron capturas del dashboard y de seguridad en escritorio, y del dashboard móvil. Se ajustaron tamaño, contraste y etiquetas accesibles de los campos después de la primera revisión. La última ejecución de navegador pasó tras esos ajustes.

Las capturas de prueba se generan en `artifacts/`. El reporte navegable queda en `playwright-report/` y las trazas de fallos, cuando existan, en `test-results/`.

Se incluyen capturas de referencia del [dashboard](capturas/panel.png) y de [seguridad escolar](capturas/seguridad.png).

## Límites de la evidencia

No se verificaron Firefox, Safari, lectores de pantalla ni cumplimiento formal completo de WCAG. No se probaron GPS, cámaras ni servicios institucionales porque no están implementados. No se hizo una prueba de carga institucional ni un despliegue público. La compilación y los recorridos locales no equivalen a una certificación de producción.
