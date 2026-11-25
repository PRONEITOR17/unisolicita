'use strict';
const { AppError, NoEncontradoError } = require('../errors');

const TITULOS = {
  400: 'Datos no válidos',
  401: 'Sesión requerida',
  403: 'Acceso denegado',
  404: 'No encontrado',
  422: 'No se puede realizar la acción',
  429: 'Demasiados intentos',
};
const MENSAJE_GENERICO = 'Ocurrió un error inesperado. Inténtalo de nuevo.';

function noEncontrado(req, res, next) {
  next(new NoEncontradoError('La página que buscas no existe.'));
}

/** Estado HTTP y mensaje seguro para mostrar: los errores internos no filtran detalles. */
function describirError(err) {
  if (err instanceof AppError) return { status: err.status, mensaje: err.message };
  const status = err.status || err.statusCode || 500;
  if (status < 500) return { status, mensaje: err.message };
  console.error(err);
  return { status, mensaje: MENSAJE_GENERICO };
}

function manejarErrores(err, req, res, next) {
  if (res.headersSent) return next(err);
  const { status, mensaje } = describirError(err);

  if (req.accepts(['html', 'json']) === 'json') {
    return res.status(status).json({ error: mensaje });
  }
  return res.status(status).render('error', {
    titulo: TITULOS[status] || 'Error',
    status,
    mensaje,
    usuario: req.usuario || null,
    noLeidas: res.locals.noLeidas || 0,
    ruta: '',
  });
}

module.exports = { noEncontrado, manejarErrores };
