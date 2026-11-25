'use strict';
const { AppError } = require('../errors');

/** "Mi cuenta": datos de la persona que inició sesión y cambio de contraseña. */
class CuentaController {
  constructor(c) {
    this.c = c;
  }

  _vista(res, error = null) {
    return res.render('cuenta', { titulo: 'Mi cuenta', ruta: '/cuenta', error });
  }

  ver = (req, res) => this._vista(res);

  cambiarContrasena = async (req, res) => {
    try {
      await this.c.usuarios.cambiarContrasena(req.usuario, {
        actual: req.body.actual,
        nueva: req.body.nueva,
        confirmar: req.body.confirmar,
      });
      res.flash('exito', 'Tu contraseña se actualizó correctamente.');
      return res.redirect('/cuenta');
    } catch (err) {
      if (!(err instanceof AppError) || err.status >= 403) throw err;
      return this._vista(res.status(err.status), err.message);
    }
  };
}

module.exports = { CuentaController };
