'use strict';
const express = require('express');
const { asyncHandler: a } = require('../middleware/asyncHandler');
const { AuthController } = require('../controllers/AuthController');
const { DashboardController } = require('../controllers/DashboardController');
const { SolicitudController } = require('../controllers/SolicitudController');
const { UsuarioController } = require('../controllers/UsuarioController');
const { CategoriaController } = require('../controllers/CategoriaController');
const { NotificacionController } = require('../controllers/NotificacionController');
const { ReporteController } = require('../controllers/ReporteController');
const { CuentaController } = require('../controllers/CuentaController');
const { AyudaController } = require('../controllers/AyudaController');

/** Tabla de rutas. Cada ruta declara qué roles pueden entrar (RN08, RF02). */
function crearRutas(contenedor, { requerirSesion, requerirRol }) {
  const r = express.Router();
  const auth = new AuthController(contenedor);
  const panel = new DashboardController(contenedor);
  const sol = new SolicitudController(contenedor);
  const usr = new UsuarioController(contenedor);
  const cat = new CategoriaController(contenedor);
  const not = new NotificacionController(contenedor);
  const rep = new ReporteController(contenedor);
  const cuenta = new CuentaController(contenedor);
  const ayuda = new AyudaController(contenedor);

  const admin = requerirRol('ADMINISTRADOR');
  const estudiante = requerirRol('ESTUDIANTE');
  const gestion = requerirRol('ADMINISTRADOR', 'SUPERVISOR');

  r.get('/healthz', a(async (req, res) => {
    await contenedor.db.query('SELECT 1');
    res.json({ estado: 'ok' });
  }));

  r.get('/', (req, res) => res.redirect(req.usuario ? '/panel' : '/login'));
  r.get('/login', auth.mostrarLogin);
  r.post('/login', a(auth.login));
  r.post('/logout', auth.logout);

  // A partir de aquí se necesita sesión iniciada
  r.use(requerirSesion);
  r.get('/panel', a(panel.panel));

  r.get('/ayuda', ayuda.ver);
  r.get('/cuenta', cuenta.ver);
  r.post('/cuenta/contrasena', a(cuenta.cambiarContrasena));

  r.get('/solicitudes', a(sol.listar));
  r.get('/solicitudes/nueva', estudiante, a(sol.nueva));
  r.post('/solicitudes', estudiante, a(sol.crear));
  r.get('/solicitudes/:id(\\d+)', a(sol.detalle));
  r.post('/solicitudes/:id(\\d+)/asignar', admin, a(sol.asignar));
  r.post('/solicitudes/:id(\\d+)/estado', a(sol.cambiarEstado));
  r.post('/solicitudes/:id(\\d+)/observaciones', a(sol.observar));

  r.get('/usuarios', admin, a(usr.listar));
  r.get('/usuarios/nuevo', admin, a(usr.nuevo));
  r.post('/usuarios', admin, a(usr.crear));
  r.get('/usuarios/:id(\\d+)/editar', admin, a(usr.editar));
  r.post('/usuarios/:id(\\d+)', admin, a(usr.actualizar));
  r.post('/usuarios/:id(\\d+)/activo', admin, a(usr.cambiarActivo));

  r.get('/categorias', admin, a(cat.listar));
  r.post('/categorias', admin, a(cat.crear));
  r.post('/categorias/:id(\\d+)', admin, a(cat.actualizar));
  r.post('/categorias/:id(\\d+)/activa', admin, a(cat.cambiarActiva));

  r.get('/notificaciones', a(not.listar));
  r.get('/notificaciones/novedades', a(not.novedades));
  r.post('/notificaciones/leer-todas', a(not.leerTodas));
  r.post('/notificaciones/:id(\\d+)/leer', a(not.leer));

  r.get('/reportes', gestion, a(rep.ver));
  r.get('/reportes/exportar.csv', gestion, a(rep.exportar));

  return r;
}

module.exports = { crearRutas };
