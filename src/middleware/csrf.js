'use strict';
const crypto = require('crypto');
const { AccesoDenegadoError } = require('../errors');

const METODOS_SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Protección CSRF con "double submit cookie": el token va en una cookie httpOnly
 * y también en un campo oculto de cada formulario; deben coincidir en los POST.
 */
function csrf({ activo = true, secure = false } = {}) {
  return (req, res, next) => {
    let token = req.cookies.csrf;
    if (!/^[a-f0-9]{48}$/.test(token || '')) {
      token = crypto.randomBytes(24).toString('hex');
      res.cookie('csrf', token, { httpOnly: true, sameSite: 'lax', secure });
    }
    res.locals.csrfToken = token;
    if (!activo || METODOS_SEGUROS.has(req.method)) return next();

    const enviado = Buffer.from(String((req.body && req.body._csrf) || ''));
    const esperado = Buffer.from(token);
    if (enviado.length !== esperado.length || !crypto.timingSafeEqual(enviado, esperado)) {
      return next(
        new AccesoDenegadoError('El formulario expiró. Recarga la página e inténtalo de nuevo.'),
      );
    }
    return next();
  };
}

module.exports = { csrf };
