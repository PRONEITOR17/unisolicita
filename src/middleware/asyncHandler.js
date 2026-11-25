'use strict';

/** Express 4 no captura errores de funciones async: este envoltorio los pasa a next(). */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { asyncHandler };
