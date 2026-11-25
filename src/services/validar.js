'use strict';
const { ValidationError } = require('../errors');
const { PRIORIDADES, ROLES } = require('../domain/models');
const { ESTADOS } = require('../domain/estados');

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const texto = (valor) => String(valor ?? '').trim();

function entero(valor) {
  const n = Number.parseInt(valor, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function requerido(valor, etiqueta, { min = 1, max = 255 } = {}) {
  const limpio = texto(valor);
  if (limpio.length < min) {
    throw new ValidationError(
      min > 1 ? `${etiqueta} debe tener al menos ${min} caracteres.` : `${etiqueta} es obligatorio.`,
    );
  }
  if (limpio.length > max) {
    throw new ValidationError(`${etiqueta} no puede superar ${max} caracteres.`);
  }
  return limpio;
}

function correo(valor) {
  const limpio = requerido(valor, 'El correo', { max: 160 }).toLowerCase();
  if (!REGEX_CORREO.test(limpio)) throw new ValidationError('El correo no es válido.');
  return limpio;
}

function contrasena(valor) {
  const clave = String(valor ?? '');
  if (clave.length < 8) throw new ValidationError('La contraseña debe tener al menos 8 caracteres.');
  if (!/[A-Za-z]/.test(clave) || !/\d/.test(clave)) {
    throw new ValidationError('La contraseña debe combinar letras y números.');
  }
  return clave;
}

function prioridad(valor) {
  const p = texto(valor).toUpperCase();
  if (!PRIORIDADES.includes(p)) throw new ValidationError('La prioridad debe ser Baja, Media o Alta.');
  return p;
}

function rol(valor) {
  const r = texto(valor).toUpperCase();
  if (!ROLES.includes(r)) throw new ValidationError('El rol no es válido.');
  return r;
}

/** Normaliza los filtros de listados y reportes: ignora lo que no sea válido. */
function filtros(entrada = {}) {
  const salida = {};
  const estado = texto(entrada.estado).toUpperCase();
  if (ESTADOS.some((e) => e.nombre === estado)) salida.estado = estado;
  const p = texto(entrada.prioridad).toUpperCase();
  if (PRIORIDADES.includes(p)) salida.prioridad = p;
  const idCategoria = entero(entrada.categoria);
  if (idCategoria) salida.idCategoria = idCategoria;
  if (entrada.responsable === 'sin') salida.sinResponsable = true;
  else if (entero(entrada.responsable)) salida.idResponsable = entero(entrada.responsable);
  const fecha = /^\d{4}-\d{2}-\d{2}$/;
  if (fecha.test(texto(entrada.desde))) salida.desde = texto(entrada.desde);
  if (fecha.test(texto(entrada.hasta))) salida.hasta = texto(entrada.hasta);
  if (texto(entrada.q)) salida.texto = texto(entrada.q).slice(0, 80);
  return salida;
}

module.exports = { texto, entero, requerido, correo, contrasena, prioridad, rol, filtros };
