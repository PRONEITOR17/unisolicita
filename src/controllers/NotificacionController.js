'use strict';

class NotificacionController {
  constructor(c) {
    this.c = c;
  }

  listar = async (req, res) => {
    res.render('notificaciones', {
      titulo: 'Notificaciones',
      ruta: '/notificaciones',
      notificaciones: await this.c.notificaciones.listar(req.usuario),
    });
  };

  /** JSON para el aviso en vivo (sonido y cartel): lo consulta public/js/avisos.js cada pocos segundos. */
  novedades = async (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json(await this.c.notificaciones.novedades(req.usuario, req.query.desde));
  };

  /** Marca la notificación como leída y lleva a la solicitud relacionada. */
  leer = async (req, res) => {
    await this.c.notificaciones.marcarLeida(req.usuario, Number(req.params.id));
    const destino = Number(req.body.solicitud);
    res.redirect(destino ? `/solicitudes/${destino}` : '/notificaciones');
  };

  leerTodas = async (req, res) => {
    await this.c.notificaciones.marcarTodas(req.usuario);
    res.flash('exito', 'Marcaste todas las notificaciones como leídas.');
    res.redirect('/notificaciones');
  };
}

module.exports = { NotificacionController };
