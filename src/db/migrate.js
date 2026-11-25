'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ_DB = path.join(__dirname, '..', '..', 'db');

const leer = (archivo) => fs.readFileSync(path.join(RAIZ_DB, archivo), 'utf8');

/**
 * Crea las tablas y los datos iniciales (roles y categorías).
 * Con usuariosDemo (por defecto sí) agrega además las cuentas de demostración.
 */
async function inicializar(db, { usuariosDemo = true } = {}) {
  await db.exec(leer('schema.sql'));
  await db.exec(leer('seed.sql'));
  if (usuariosDemo) await db.exec(leer('seed_demo.sql'));
}

/** Inicializa solo si la base todavía no tiene el esquema. */
async function inicializarSiVacia(db, opciones) {
  const { rows } = await db.query("SELECT to_regclass('public.usuario') AS tabla");
  if (!rows[0].tabla) {
    await inicializar(db, opciones);
    return true;
  }
  return false;
}

module.exports = { inicializar, inicializarSiVacia };

if (require.main === module) {
  const config = require('../config');
  const { crearDb } = require('./index');
  (async () => {
    const db = await crearDb(config);
    await inicializar(db, { usuariosDemo: config.mostrarDemo });
    console.log(`Base de datos lista (${db.tipo}).`);
    await db.cerrar();
  })().catch((error) => {
    console.error('No se pudo inicializar la base de datos:', error.message);
    process.exit(1);
  });
}
