'use strict';
const { AppError } = require('../errors');

const VACIO = { nombre: '', correo: '', rol: 'ESTUDIANTE' };

class UsuarioController {
  constructor(c) {
    this.c = c;
  }

  _formulario = async (res, { usuarioEditado = null, valores = VACIO, error = null } = {}) => {
    res.render('usuarios/formulario', {
      titulo: usuarioEditado ? 'Editar usuario' : 'Nuevo usuario',
      ruta: '/usuarios',
      roles: await this.c.usuarios.roles(),
      usuarioEditado,
      valores,
      error,
    });
  };

  listar = async (req, res) => {
    const rol = req.query.rol ? String(req.query.rol).toUpperCase() : undefined;
    res.render('usuarios/lista', {
      titulo: 'Usuarios',
      ruta: '/usuarios',
      usuarios: await this.c.usuarios.listar({ rol }),
      roles: await this.c.usuarios.roles(),
      rolFiltro: rol || '',
    });
  };

  nuevo = (req, res) => this._formulario(res);

  crear = async (req, res) => {
    try {
      const usuario = await this.c.usuarios.crear(req.body);
      res.flash('exito', `Usuario ${usuario.nombre} creado.`);
      return res.redirect('/usuarios');
    } catch (err) {
      if (!(err instanceof AppError) || err.status >= 403) throw err;
      return this._formulario(res.status(err.status), { valores: req.body, error: err.message });
    }
  };

  editar = async (req, res) => {
    const usuarioEditado = await this.c.usuarios.obtener(Number(req.params.id));
    return this._formulario(res, {
      usuarioEditado,
      valores: { nombre: usuarioEditado.nombre, correo: usuarioEditado.correo, rol: usuarioEditado.rol },
    });
  };

  actualizar = async (req, res) => {
    const id = Number(req.params.id);
    try {
      await this.c.usuarios.actualizar(req.usuario, id, req.body);
      res.flash('exito', 'Usuario actualizado.');
      return res.redirect('/usuarios');
    } catch (err) {
      if (!(err instanceof AppError) || err.status >= 403) throw err;
      const usuarioEditado = await this.c.usuarios.obtener(id);
      return this._formulario(res.status(err.status), {
        usuarioEditado,
        valores: req.body,
        error: err.message,
      });
    }
  };

  cambiarActivo = async (req, res) => {
    const activo = req.body.activo === 'true';
    try {
      await this.c.usuarios.cambiarActivo(req.usuario, Number(req.params.id), activo);
      res.flash('exito', activo ? 'Usuario activado.' : 'Usuario desactivado. Su historial se conserva.');
    } catch (err) {
      if (!(err instanceof AppError) || err.status >= 403) throw err;
      res.flash('error', err.message);
    }
    res.redirect('/usuarios');
  };
}

module.exports = { UsuarioController };
