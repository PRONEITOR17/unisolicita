'use strict';
const { EventBus, registrarNotificador } = require('./domain/eventos');
const { AuthService } = require('./services/AuthService');
const { UsuarioService } = require('./services/UsuarioService');
const { CategoriaService } = require('./services/CategoriaService');
const { SolicitudService } = require('./services/SolicitudService');
const { NotificacionService } = require('./services/NotificacionService');
const { ReporteService } = require('./services/ReporteService');
const { CorreoService } = require('./services/CorreoService');

/** Crea los servicios con sus dependencias (inyección manual). */
function crearContenedor({ db, config, correo }) {
  const servicioCorreo =
    correo || new CorreoService({ smtp: config.smtp, appUrl: config.appUrl });
  const bus = new EventBus();
  registrarNotificador(bus, servicioCorreo);
  return {
    db,
    config,
    bus,
    correo: servicioCorreo,
    auth: new AuthService({ db, config }),
    usuarios: new UsuarioService({ db }),
    categorias: new CategoriaService({ db }),
    solicitudes: new SolicitudService({ db, bus }),
    notificaciones: new NotificacionService({ db }),
    reportes: new ReporteService({ db }),
  };
}

module.exports = { crearContenedor };
