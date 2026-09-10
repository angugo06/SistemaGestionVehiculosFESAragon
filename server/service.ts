import { AdministrationService } from './services/administration.ts';

export { AppError, localDate, localTime } from './services/base.ts';

/**
 * Fachada estable de los casos de uso del sistema.
 *
 * La implementación se divide por dominio, mientras las rutas, semillas y pruebas
 * conservan un único punto de entrada.
 */
export class MobilityService extends AdministrationService {}
