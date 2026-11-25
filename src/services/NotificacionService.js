'use strict';
const { crearRepos } = require('../repositories');

class NotificacionService {
  constructor({ db }) {
    this.db = db;
  }

  listar(actor) {
    return crearRepos(this.db).notificaciones.porUsuario(actor.id);
  }

  contarNoLeidas(idUsuario) {
    return crearRepos(this.db).notificaciones.contarNoLeidas(idUsuario);
  }

  novedades(actor, desde) {
    return crearRepos(this.db).notificaciones.novedades(actor.id, Number(desde) || 0);
  }

  marcarLeida(actor, id) {
    return crearRepos(this.db).notificaciones.marcarLeida(id, actor.id);
  }

  marcarTodas(actor) {
    return crearRepos(this.db).notificaciones.marcarTodas(actor.id);
  }
}

module.exports = { NotificacionService };
