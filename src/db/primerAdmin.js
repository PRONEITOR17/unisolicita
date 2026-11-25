'use strict';
const { crearRepos } = require('../repositories');
const { UsuarioService } = require('../services/UsuarioService');

/**
 * Crea el primer administrador real (ADMIN_CORREO / ADMIN_CLAVE) si todavía no hay ninguno activo.
 * Así un sistema nuevo en producción nunca depende de cuentas de demostración.
 * Devuelve el usuario creado, o null si no hacía falta.
 */
async function asegurarAdministrador(db, { nombre, correo, clave }) {
  if (!correo || !clave) return null;
  const existentes = await crearRepos(db).usuarios.administradoresActivos();
  if (existentes.length) return null;
  return new UsuarioService({ db }).crear({ nombre, correo, contrasena: clave, rol: 'ADMINISTRADOR' });
}

module.exports = { asegurarAdministrador };
