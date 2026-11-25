'use strict';
/**
 * Crea un administrador desde la terminal (detén el servidor antes si usas la base embebida):
 *   npm run crear-admin -- --correo rectoria@universidad.edu --nombre "Ana Pérez" --clave Clave1234
 * También lee ADMIN_CORREO, ADMIN_NOMBRE y ADMIN_CLAVE del entorno o del archivo .env.
 */
const config = require('../src/config');
const { crearDb } = require('../src/db');
const { inicializarSiVacia } = require('../src/db/migrate');
const { UsuarioService } = require('../src/services/UsuarioService');

function argumento(nombre) {
  const i = process.argv.indexOf(`--${nombre}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

(async () => {
  const datos = {
    nombre: argumento('nombre') || config.adminInicial.nombre,
    correo: argumento('correo') || config.adminInicial.correo,
    contrasena: argumento('clave') || config.adminInicial.clave,
    rol: 'ADMINISTRADOR',
  };
  if (!datos.correo || !datos.contrasena) {
    console.error('Falta el correo o la clave. Ejemplo:\n  npm run crear-admin -- --correo yo@universidad.edu --nombre "Mi Nombre" --clave Clave1234');
    process.exit(1);
  }
  const db = await crearDb(config);
  await inicializarSiVacia(db, { usuariosDemo: config.mostrarDemo });
  const usuario = await new UsuarioService({ db }).crear(datos);
  console.log(`Administrador creado: ${usuario.nombre} <${usuario.correo}>`);
  await db.cerrar();
})().catch((error) => {
  console.error('No se pudo crear el administrador:', error.message);
  process.exit(1);
});
