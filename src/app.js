'use strict';
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const helpers = require('./views/helpers');
const defaultConfig = require('./config');
const { crearContenedor } = require('./container');
const { crearAuth } = require('./middleware/auth');
const { csrf } = require('./middleware/csrf');
const { flash } = require('./middleware/flash');
const { seguridad } = require('./middleware/seguridad');
const { noEncontrado, manejarErrores } = require('./middleware/errores');
const { crearRutas } = require('./routes');

/**
 * Construye la aplicación Express.
 * @param {object} opciones  db (obligatorio), config, csrf (false solo en pruebas), correo (solo pruebas)
 */
function createApp({ db, config = defaultConfig, csrf: activarCsrf = true, correo }) {
  const app = express();
  const contenedor = crearContenedor({ db, config, correo });
  const auth = crearAuth(contenedor);
  const raiz = path.join(__dirname, '..');

  app.disable('x-powered-by');
  if (config.confiarProxy) app.set('trust proxy', 1);
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.locals = { ...app.locals, ...helpers, soporteCorreo: config.soporteCorreo,
    leyendaPie: config.env === 'production' ? '' : 'Proyecto final de Ingeniería del Software',
  };

  app.use(seguridad());
  app.use('/vendor/chart.js', express.static(path.join(raiz, 'node_modules', 'chart.js', 'dist')));
  app.use(express.static(path.join(raiz, 'public'), { maxAge: config.env === 'production' ? '1h' : 0 }));
  app.use(express.urlencoded({ extended: false, limit: '50kb' }));
  app.use(cookieParser());
  app.use(flash({ secure: config.cookieSecure }));
  app.use(csrf({ activo: activarCsrf, secure: config.cookieSecure }));
  app.use(auth.cargarUsuario);
  app.use(crearRutas(contenedor, auth));
  app.use(noEncontrado);
  app.use(manejarErrores);

  app.locals.contenedor = contenedor;
  return app;
}

module.exports = { createApp };
