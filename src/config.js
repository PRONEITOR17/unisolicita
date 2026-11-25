'use strict';
require('dotenv').config();
const path = require('path');

const env = process.env.NODE_ENV || 'development';
const SECRETO_DEV = 'secreto-de-desarrollo-cambiar';

const port = Number(process.env.PORT) || 3000;
const smtpPuerto = Number(process.env.SMTP_PORT) || 587;
const usuarioSmtp = process.env.SMTP_USER || '';

const config = {
  env,
  port,
  // Si DATABASE_URL está vacío se usa PostgreSQL embebido (PGlite) en ./data/pgdata
  databaseUrl: process.env.DATABASE_URL || '',
  pgSsl: process.env.PGSSL === 'true',
  pgliteDir: process.env.PGLITE_DIR || path.join(__dirname, '..', 'data', 'pgdata'),
  timezone: process.env.DB_TIMEZONE || 'America/Bogota',
  jwtSecret: process.env.JWT_SECRET || SECRETO_DEV,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  mostrarDemo: process.env.SHOW_DEMO ? process.env.SHOW_DEMO === 'true' : env !== 'production',
  // Dirección pública del sistema (se usa en los enlaces de los correos)
  appUrl: (process.env.APP_URL || `http://localhost:${port}`).replace(/\/$/, ''),
  soporteCorreo: process.env.SOPORTE_CORREO || 'soporte@unisolicita.edu',
  // Correos de notificación: si SMTP_HOST está vacío, el sistema funciona sin enviar correos
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: smtpPuerto,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : smtpPuerto === 465,
    user: usuarioSmtp,
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || usuarioSmtp,
  },
  // Primer administrador real: se crea al iniciar si todavía no existe ninguno
  adminInicial: {
    nombre: process.env.ADMIN_NOMBRE || 'Administrador',
    correo: (process.env.ADMIN_CORREO || '').trim().toLowerCase(),
    clave: process.env.ADMIN_CLAVE || '',
  },
  // Detrás de un proxy (Render, Railway…) hay que confiar en él para ver la IP real
  confiarProxy: process.env.TRUST_PROXY ? process.env.TRUST_PROXY === 'true' : env === 'production',
  maxIntentosLogin: Number(process.env.MAX_INTENTOS_LOGIN) || 5,
  ventanaLoginMin: 15,
};

if (env === 'production' && config.jwtSecret === SECRETO_DEV) {
  throw new Error('Define JWT_SECRET en el entorno antes de iniciar en producción.');
}

module.exports = config;
