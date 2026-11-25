'use strict';
const { AppError } = require('../errors');

const CUENTAS_DEMO = [
  { rol: 'Administrador', correo: 'admin@unisolicita.edu' },
  { rol: 'Supervisor', correo: 'supervisor@unisolicita.edu' },
  { rol: 'Funcionario', correo: 'funcionario1@unisolicita.edu' },
  { rol: 'Estudiante', correo: 'estudiante1@unisolicita.edu' },
];

class AuthController {
  constructor(c) {
    this.c = c;
  }

  _vista(res, extra = {}) {
    return res.render('login', {
      titulo: 'Iniciar sesión',
      correo: '',
      error: null,
      cuentasDemo: this.c.config.mostrarDemo ? CUENTAS_DEMO : [],
      ...extra,
    });
  }

  mostrarLogin = (req, res) => {
    if (req.usuario) return res.redirect('/panel');
    return this._vista(res);
  };

  login = async (req, res) => {
    const correo = String(req.body.correo || '').trim();
    try {
      const { token } = await this.c.auth.iniciarSesion(correo, req.body.contrasena, req.ip);
      res.cookie('token', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: this.c.config.cookieSecure,
      });
      return res.redirect('/panel');
    } catch (err) {
      if (!(err instanceof AppError)) throw err;
      return this._vista(res.status(err.status), { correo, error: err.message });
    }
  };

  logout = (req, res) => {
    res.clearCookie('token');
    res.flash('exito', 'Cerraste sesión correctamente.');
    res.redirect('/login');
  };
}

module.exports = { AuthController };
