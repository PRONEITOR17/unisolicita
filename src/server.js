'use strict';
const config = require('./config');
const { crearDb } = require('./db');
const { inicializarSiVacia } = require('./db/migrate');
const { asegurarAdministrador } = require('./db/primerAdmin');
const { crearRepos } = require('./repositories');
const { createApp } = require('./app');

async function iniciar() {
  const db = await crearDb({
    databaseUrl: config.databaseUrl,
    pgSsl: config.pgSsl,
    pgliteDir: config.pgliteDir,
    timezone: config.timezone,
  });
  await inicializarSiVacia(db, { usuariosDemo: config.mostrarDemo });
  const creado = await asegurarAdministrador(db, config.adminInicial);
  if (creado) console.log(`Administrador inicial creado: ${creado.correo}`);
  if (!(await crearRepos(db).usuarios.administradoresActivos()).length) {
    console.warn('Aviso: no hay ningún administrador. Define ADMIN_CORREO y ADMIN_CLAVE y reinicia.');
  }
  const app = createApp({ db, config });
  const servidor = app.listen(config.port, () => {
    const motor = config.databaseUrl ? 'PostgreSQL' : 'PostgreSQL embebido (PGlite)';
    console.log(`UniSolicita en http://localhost:${config.port}  ·  base de datos: ${motor}`);
  });

  const cerrar = async () => {
    servidor.close();
    await db.cerrar();
    process.exit(0);
  };
  process.on('SIGINT', cerrar);
  process.on('SIGTERM', cerrar);
}

iniciar().catch((err) => {
  console.error('No se pudo iniciar el sistema:', err.message);
  process.exit(1);
});
