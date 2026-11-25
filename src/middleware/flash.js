'use strict';

/** Mensajes de una sola vez (éxito, error, aviso) guardados en una cookie corta. */
function flash({ secure = false } = {}) {
  return (req, res, next) => {
    const guardado = req.cookies.flash;
    res.locals.flash = guardado && typeof guardado === 'object' ? guardado : null;
    if (guardado) res.clearCookie('flash');
    res.flash = (tipo, mensaje) =>
      res.cookie('flash', { tipo, mensaje: String(mensaje).slice(0, 300) }, {
        httpOnly: true,
        sameSite: 'lax',
        secure,
        maxAge: 60 * 1000,
      });
    next();
  };
}

module.exports = { flash };
