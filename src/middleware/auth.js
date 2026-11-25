'use strict';
const { asyncHandler } = require('./asyncHandler');
const { AccesoDenegadoError } = require('../errors');

/** Autenticación (JWT en cookie httpOnly) y autorización por rol. */
function crearAuth(contenedor) {
  const cargarUsuario = asyncHandler(async (req, res, next) => {
    const usuario = await contenedor.auth.usuarioDesdeToken(req.cookies.token);
    req.usuario = usuario;
    res.locals.usuario = usuario;
    res.locals.noLeidas = usuario ? await contenedor.notificaciones.contarNoLeidas(usuario.id) : 0;
    next();
  });

  const requerirSesion = (req, res, next) => {
    if (req.usuario) return next();
    res.flash('aviso', 'Inicia sesión para continuar.');
    return res.redirect('/login');
  };

  const requerirRol =
    (...roles) =>
    (req, res, next) =>
      roles.includes(req.usuario.rol) ? next() : next(new AccesoDenegadoError());

  return { cargarUsuario, requerirSesion, requerirRol };
}

module.exports = { crearAuth };
