'use strict';
const bcrypt = require('bcryptjs');
const { crearRepos } = require('../repositories');
const { ValidationError, NoEncontradoError, ReglaNegocioError } = require('../errors');
const validar = require('./validar');

class UsuarioService {
  constructor({ db }) {
    this.db = db;
  }

  listar(filtro) {
    return crearRepos(this.db).usuarios.listar(filtro);
  }

  roles() {
    return crearRepos(this.db).roles.listar();
  }

  async obtener(id) {
    const usuario = await crearRepos(this.db).usuarios.porId(id);
    if (!usuario) throw new NoEncontradoError('El usuario no existe.');
    return usuario;
  }

  async _datosValidados(repos, entrada, { idActual = null, claveObligatoria }) {
    const nombre = validar.requerido(entrada.nombre, 'El nombre', { min: 3, max: 120 });
    const correo = validar.correo(entrada.correo);
    const nombreRol = validar.rol(entrada.rol);
    const roles = await repos.roles.listar();
    const rol = roles.find((r) => r.nombre === nombreRol);
    const existente = await repos.usuarios.porCorreo(correo);
    if (existente && existente.id !== idActual) {
      throw new ValidationError('Ya existe un usuario con ese correo.');
    }
    let hash = null;
    if (claveObligatoria || validar.texto(entrada.contrasena)) {
      hash = await bcrypt.hash(validar.contrasena(entrada.contrasena), 10);
    }
    return { nombre, correo, idRol: rol.id, hash };
  }

  async crear(entrada) {
    const repos = crearRepos(this.db);
    const datos = await this._datosValidados(repos, entrada, { claveObligatoria: true });
    return repos.usuarios.crear(datos);
  }

  async actualizar(actor, id, entrada) {
    const repos = crearRepos(this.db);
    const actual = await this.obtener(id);
    const datos = await this._datosValidados(repos, entrada, {
      idActual: id,
      claveObligatoria: false,
    });
    if (actual.id === actor.id && validar.rol(entrada.rol) !== actor.rol) {
      throw new ReglaNegocioError('No puedes cambiar tu propio rol.');
    }
    return repos.usuarios.actualizar(id, datos);
  }

  /** Cada persona cambia su propia contraseña: pide la actual y confirma la nueva. */
  async cambiarContrasena(actor, { actual, nueva, confirmar }) {
    const usuario = await this.obtener(actor.id);
    if (!(await bcrypt.compare(String(actual ?? ''), usuario.hash))) {
      throw new ValidationError('La contraseña actual no es correcta.');
    }
    if (String(nueva ?? '') !== String(confirmar ?? '')) {
      throw new ValidationError('La confirmación no coincide con la nueva contraseña.');
    }
    if (String(nueva) === String(actual)) {
      throw new ValidationError('La nueva contraseña debe ser distinta de la actual.');
    }
    const hash = await bcrypt.hash(validar.contrasena(nueva), 10);
    await crearRepos(this.db).usuarios.actualizarHash(usuario.id, hash);
  }

  async cambiarActivo(actor, id, activo) {
    const repos = crearRepos(this.db);
    const usuario = await this.obtener(id);
    if (usuario.id === actor.id && !activo) {
      throw new ReglaNegocioError('No puedes desactivar tu propio usuario.');
    }
    await repos.usuarios.cambiarActivo(id, activo); // RN12: se desactiva, nunca se elimina
  }
}

module.exports = { UsuarioService };
