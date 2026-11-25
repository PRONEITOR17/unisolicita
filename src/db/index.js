'use strict';
const fs = require('fs');
const path = require('path');

/**
 * Capa de acceso a la base de datos.
 * Expone la misma interfaz sobre PostgreSQL real (pg) o PostgreSQL embebido (PGlite):
 *   query(texto, params) -> { rows }
 *   exec(sql)            -> ejecuta varias sentencias
 *   tx(fn)               -> fn recibe { query } dentro de una transacción (COMMIT / ROLLBACK)
 *   cerrar()
 */
/**
 * Con PGSSL=true la opción `ssl` del programa debe mandar: si la URL trae `?sslmode=require` (como la de Neon),
 * la librería pg la usaría en su lugar y exigiría validar el certificado del proveedor.
 */
function urlSinSslmode(url) {
  try {
    const u = new URL(url);
    u.searchParams.delete('sslmode');
    return u.toString();
  } catch {
    return url;
  }
}

function crearConexionPg({ databaseUrl, pgSsl, timezone }) {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: pgSsl ? urlSinSslmode(databaseUrl) : databaseUrl,
    ssl: pgSsl ? { rejectUnauthorized: false } : undefined,
  });
  // Cada conexión nueva fija la zona horaria; se espera esa promesa antes de usarla.
  pool.on('connect', (client) => {
    client.listaZona = client.query(`SET TIME ZONE '${timezone}'`).catch(() => {});
  });
  const conCliente = async (fn) => {
    const client = await pool.connect();
    try {
      await client.listaZona;
      return await fn(client);
    } finally {
      client.release();
    }
  };
  return {
    tipo: 'postgresql',
    query: (texto, params) => conCliente((client) => client.query(texto, params)),
    exec: (sql) => conCliente((client) => client.query(sql)),
    tx: (fn) =>
      conCliente(async (client) => {
        await client.query('BEGIN');
        try {
          const resultado = await fn({ query: (t, p) => client.query(t, p) });
          await client.query('COMMIT');
          return resultado;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      }),
    cerrar: () => pool.end(),
  };
}

async function crearConexionPglite({ pgliteDir, timezone }) {
  const { PGlite } = require('@electric-sql/pglite');
  if (!pgliteDir.startsWith('memory:')) {
    fs.mkdirSync(path.dirname(pgliteDir), { recursive: true });
  }
  const db = new PGlite(pgliteDir);
  await db.waitReady;
  await db.exec(`SET TIME ZONE '${timezone}'`);
  return {
    tipo: 'pglite',
    query: (texto, params) => db.query(texto, params),
    exec: (sql) => db.exec(sql),
    tx: (fn) => db.transaction((tx) => fn({ query: (t, p) => tx.query(t, p) })),
    cerrar: () => db.close(),
  };
}

async function crearDb(opciones) {
  if (opciones.databaseUrl) return crearConexionPg(opciones);
  return crearConexionPglite(opciones);
}

module.exports = { crearDb, urlSinSslmode };
