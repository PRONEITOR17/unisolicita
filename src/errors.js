'use strict';

/** Error base de la aplicación: lleva el código HTTP que corresponde. */
class AppError extends Error {
  constructor(mensaje, status = 400, detalle = null) {
    super(mensaje);
    this.name = this.constructor.name;
    this.status = status;
    this.detalle = detalle;
  }
}

class ValidationError extends AppError {
  constructor(mensaje, campos = {}) {
    super(mensaje, 400, campos);
  }
}

class AutenticacionError extends AppError {
  constructor(mensaje = 'Correo o contraseña incorrectos.') {
    super(mensaje, 401);
  }
}

class AccesoDenegadoError extends AppError {
  constructor(mensaje = 'No tienes permiso para realizar esta acción.') {
    super(mensaje, 403);
  }
}

class NoEncontradoError extends AppError {
  constructor(mensaje = 'No se encontró lo que buscas.') {
    super(mensaje, 404);
  }
}

class ReglaNegocioError extends AppError {
  constructor(mensaje) {
    super(mensaje, 422);
  }
}

module.exports = {
  AppError,
  ValidationError,
  AutenticacionError,
  AccesoDenegadoError,
  NoEncontradoError,
  ReglaNegocioError,
};
