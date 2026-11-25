'use strict';
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { crearRepos } = require('../repositories');
const { AutenticacionError, AppError } = require('../errors');
const validar = require('./validar');

// Hash de relleno: así el tiempo de respuesta es similar si el correo no existe.
const HASH_RELLENO = bcrypt.hashSync('relleno-no-valido', 10);

/** Limita los intentos fallidos de inicio de sesión por correo + IP (en memoria). */
class LimiteIntentos {
  constructor(maximo, ventanaMin) {
    this.maximo = maximo;
    this.ventanaMs = ventanaMin * 60 * 1000;
    this.fallos = new Map();
  }

  _vigentes(clave) {
    const ahora = Date.now();
    const lista = (this.fallos.get(clave) || []).filter((t) => ahora - t < this.ventanaMs);
    this.fallos.set(clave, lista);
    return lista;
  }

  bloqueado(clave) {
    return this._vigentes(clave).length >= this.maximo;
  }

  registrarFallo(clave) {
    this._vigentes(clave).push(Date.now());
  }

  limpiar(clave) {
    this.fallos.delete(clave);
  }
}

class AuthService {
  constructor({ db, config }) {
    this.db = db;
    this.config = config;
    this.limite = new LimiteIntentos(config.maxIntentosLogin, config.ventanaLoginMin);
  }

  async iniciarSesion(correoEntrada, claveEntrada, ip = '') {
    const correo = validar.texto(correoEntrada).toLowerCase();
    const clave = String(claveEntrada ?? '');
    if (!correo || !clave) throw new AutenticacionError('Escribe tu correo y tu contraseña.');

    const llave = `${correo}|${ip}`;
    if (this.limite.bloqueado(llave)) {
      throw new AppError(
        'Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.',
        429,
      );
    }

    const usuario = await crearRepos(this.db).usuarios.porCorreo(correo);
    const coincide = await bcrypt.compare(clave, usuario ? usuario.hash : HASH_RELLENO);
    if (!usuario || !usuario.activo || !coincide) {
      this.limite.registrarFallo(llave);
      throw new AutenticacionError();
    }

    this.limite.limpiar(llave);
    const token = jwt.sign({ sub: usuario.id, rol: usuario.rol }, this.config.jwtSecret, {
      expiresIn: this.config.jwtExpiresIn,
    });
    return { token, usuario };
  }

  /** Devuelve el usuario activo dueño del token, o null. */
  async usuarioDesdeToken(token) {
    if (!token) return null;
    try {
      const datos = jwt.verify(token, this.config.jwtSecret);
      const usuario = await crearRepos(this.db).usuarios.porId(datos.sub);
      return usuario && usuario.activo ? usuario : null;
    } catch {
      return null;
    }
  }
}

module.exports = { AuthService, LimiteIntentos };
