'use strict';
const request = require('supertest');
const config = require('../src/config');
const { crearDb } = require('../src/db');
const { inicializar } = require('../src/db/migrate');
const { createApp } = require('../src/app');

const CLAVE = 'Demo1234*';
const CUENTAS = {
  admin: 'admin@unisolicita.edu',
  supervisor: 'supervisor@unisolicita.edu',
  func1: 'funcionario1@unisolicita.edu',
  func2: 'funcionario2@unisolicita.edu',
  est1: 'estudiante1@unisolicita.edu',
  est2: 'estudiante2@unisolicita.edu',
};

let db;
let app;

beforeAll(async () => {
  // Por defecto usa PostgreSQL embebido en memoria. Con TEST_DATABASE_URL prueba contra un PostgreSQL real
  // (¡borra y recrea el esquema public de esa base!).
  const urlReal = process.env.TEST_DATABASE_URL;
  db = await crearDb({ databaseUrl: urlReal, pgliteDir: 'memory://', timezone: config.timezone });
  if (urlReal) await db.exec('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await inicializar(db);
  app = createApp({ db, config, csrf: false });
});

afterAll(async () => {
  await db.cerrar();
});

async function sesion(correo, aplicacion = app) {
  const agente = request.agent(aplicacion);
  const r = await agente.post('/login').type('form').send({ correo, contrasena: CLAVE });
  expect(r.status).toBe(302);
  return agente;
}

const estadoDe = async (id) =>
  (await db.query('SELECT estado FROM solicitud WHERE id_solicitud = $1', [id])).rows[0].estado;

async function registrar(agente, extra = {}) {
  const r = await agente.post('/solicitudes').type('form').send({
    categoria: 1,
    prioridad: 'ALTA',
    descripcion: 'Necesito un certificado de estudio con notas.',
    ...extra,
  });
  expect(r.status).toBe(302);
  return Number(r.headers.location.split('/').pop());
}

const idDe = async (correo) =>
  (await db.query('SELECT id_usuario AS id FROM usuario WHERE correo = $1', [correo])).rows[0].id;

describe('Autenticación (RF01, RNF de seguridad)', () => {
  test('credenciales inválidas muestran un error genérico', async () => {
    const r = await request(app).post('/login').type('form').send({ correo: CUENTAS.est1, contrasena: 'incorrecta1' });
    expect(r.status).toBe(401);
    expect(r.text).toContain('Correo o contraseña incorrectos');
  });

  test('un correo inexistente recibe el mismo mensaje que una clave errónea', async () => {
    const r = await request(app).post('/login').type('form').send({ correo: 'nadie@x.co', contrasena: 'incorrecta1' });
    expect(r.status).toBe(401);
    expect(r.text).toContain('Correo o contraseña incorrectos');
  });

  test('sin sesión, las páginas internas redirigen al login', async () => {
    const r = await request(app).get('/solicitudes');
    expect(r.status).toBe(302);
    expect(r.headers.location).toBe('/login');
  });

  test('login correcto abre el panel del usuario', async () => {
    const agente = await sesion(CUENTAS.est1);
    const r = await agente.get('/panel');
    expect(r.status).toBe(200);
    expect(r.text).toContain('Hola, <em>Estudiante</em>');
  });

  test('tras varios intentos fallidos se bloquea temporalmente', async () => {
    let ultimo;
    for (let i = 0; i < 6; i += 1) {
      ultimo = await request(app).post('/login').type('form').send({ correo: 'bloqueo@unisolicita.edu', contrasena: 'incorrecta1' });
    }
    expect(ultimo.status).toBe(429);
  });

  test('las cabeceras de seguridad están presentes', async () => {
    const r = await request(app).get('/login');
    expect(r.headers['content-security-policy']).toContain("script-src 'self'");
    expect(r.headers['x-frame-options']).toBe('DENY');
    expect(r.headers['x-powered-by']).toBeUndefined();
  });

  test('un usuario desactivado no puede entrar', async () => {
    const admin = await sesion(CUENTAS.admin);
    await admin.post('/usuarios').type('form').send({
      nombre: 'Temporal Prueba', correo: 'temporal@unisolicita.edu', rol: 'ESTUDIANTE', contrasena: CLAVE,
    });
    const id = await idDe('temporal@unisolicita.edu');
    await admin.post(`/usuarios/${id}/activo`).type('form').send({ activo: 'false' });
    const r = await request(app).post('/login').type('form').send({ correo: 'temporal@unisolicita.edu', contrasena: CLAVE });
    expect(r.status).toBe(401);
  });
});

describe('Control de acceso por rol (RF02)', () => {
  test.each([
    ['est1', '/usuarios', 403],
    ['est1', '/categorias', 403],
    ['est1', '/reportes', 403],
    ['func1', '/usuarios', 403],
    ['func1', '/solicitudes/nueva', 403],
    ['supervisor', '/usuarios', 403],
    ['supervisor', '/reportes', 200],
    ['admin', '/usuarios', 200],
    ['admin', '/categorias', 200],
    ['admin', '/reportes', 200],
    ['est1', '/solicitudes/nueva', 200],
  ])('%s → GET %s = %i', async (quien, ruta, esperado) => {
    const agente = await sesion(CUENTAS[quien]);
    expect((await agente.get(ruta)).status).toBe(esperado);
  });

  test('el administrador no puede registrar solicitudes (solo estudiantes)', async () => {
    const admin = await sesion(CUENTAS.admin);
    const r = await admin.post('/solicitudes').type('form').send({ categoria: 1, prioridad: 'BAJA', descripcion: 'Texto de prueba largo' });
    expect(r.status).toBe(403);
  });

  test('rutas inexistentes devuelven 404', async () => {
    const agente = await sesion(CUENTAS.est1);
    expect((await agente.get('/no-existe')).status).toBe(404);
  });
});

describe('Ciclo de vida de una solicitud (RF04–RF09)', () => {
  let est;
  let admin;
  let func1;
  let func2;
  let id;

  beforeAll(async () => {
    [est, admin, func1, func2] = await Promise.all([
      sesion(CUENTAS.est1), sesion(CUENTAS.admin), sesion(CUENTAS.func1), sesion(CUENTAS.func2),
    ]);
  });

  test('el estudiante registra una solicitud: queda REGISTRADA con código SOL-AAAA-NNNNN', async () => {
    id = await registrar(est);
    expect(await estadoDe(id)).toBe('REGISTRADA');
    const detalle = await est.get(`/solicitudes/${id}`);
    expect(detalle.text).toMatch(/SOL-\d{4}-\d{5}/);
  });

  test('validaciones al registrar: descripción corta y categoría inexistente', async () => {
    const corta = await est.post('/solicitudes').type('form').send({ categoria: 1, prioridad: 'MEDIA', descripcion: 'corto' });
    expect(corta.status).toBe(400);
    const sinCat = await est.post('/solicitudes').type('form').send({ categoria: 9999, prioridad: 'MEDIA', descripcion: 'Una descripción suficientemente larga' });
    expect(sinCat.status).toBe(422);
  });

  test('no se puede saltar estados: REGISTRADA → RESUELTA es rechazada', async () => {
    await admin.post(`/solicitudes/${id}/estado`).type('form').send({ estado: 'RESUELTA', texto: 'x' });
    expect(await estadoDe(id)).toBe('REGISTRADA');
  });

  test('el administrador asigna un funcionario → ASIGNADA y se notifica al responsable', async () => {
    const f1 = await idDe(CUENTAS.func1);
    await admin.post(`/solicitudes/${id}/asignar`).type('form').send({ responsable: f1 });
    expect(await estadoDe(id)).toBe('ASIGNADA');
    expect((await func1.get('/notificaciones')).text).toContain('SOL-');
  });

  test('un funcionario no asignado no puede ver ni modificar la solicitud (RN08)', async () => {
    expect((await func2.get(`/solicitudes/${id}`)).status).toBe(403);
    const r = await func2.post(`/solicitudes/${id}/estado`).type('form').send({ estado: 'EN_PROCESO' });
    expect(r.status).toBe(403);
    expect(await estadoDe(id)).toBe('ASIGNADA');
  });

  test('otro estudiante no puede ver la solicitud (RN08)', async () => {
    const otro = await sesion(CUENTAS.est2);
    expect((await otro.get(`/solicitudes/${id}`)).status).toBe(403);
  });

  test('el responsable inicia la atención → EN_PROCESO', async () => {
    await func1.post(`/solicitudes/${id}/estado`).type('form').send({ estado: 'EN_PROCESO' });
    expect(await estadoDe(id)).toBe('EN_PROCESO');
  });

  test('puede agregar observaciones sin cambiar el estado', async () => {
    await func1.post(`/solicitudes/${id}/observaciones`).type('form').send({ texto: 'Se pidió el documento al área académica.' });
    expect(await estadoDe(id)).toBe('EN_PROCESO');
    expect((await func1.get(`/solicitudes/${id}`)).text).toContain('Se pidió el documento');
  });

  test('RN05: no se puede resolver sin solución', async () => {
    await func1.post(`/solicitudes/${id}/estado`).type('form').send({ estado: 'RESUELTA', texto: '' });
    expect(await estadoDe(id)).toBe('EN_PROCESO');
  });

  test('resolver con solución → RESUELTA y la solución queda guardada', async () => {
    await func1.post(`/solicitudes/${id}/estado`).type('form').send({ estado: 'RESUELTA', texto: 'Certificado enviado al correo.' });
    expect(await estadoDe(id)).toBe('RESUELTA');
    expect((await est.get(`/solicitudes/${id}`)).text).toContain('Certificado enviado al correo.');
  });

  test('el estudiante recibe una notificación por cada cambio y puede marcarlas como leídas', async () => {
    const pagina = await est.get('/notificaciones');
    expect(pagina.text).toContain('Resuelta');
    await est.post('/notificaciones/leer-todas').type('form').send({});
    const despues = await est.get('/notificaciones');
    expect(despues.text).not.toContain('Marcar todas como leídas');
  });

  test('el administrador cierra y luego reabre la solicitud', async () => {
    await admin.post(`/solicitudes/${id}/estado`).type('form').send({ estado: 'CERRADA', texto: 'Confirmado con el estudiante.' });
    expect(await estadoDe(id)).toBe('CERRADA');
    await admin.post(`/solicitudes/${id}/estado`).type('form').send({ estado: 'REABIERTA', texto: 'La solución no era la solicitada.' });
    expect(await estadoDe(id)).toBe('REABIERTA');
  });

  test('una solicitud reabierta puede reasignarse y vuelve a EN_PROCESO', async () => {
    const f2 = await idDe(CUENTAS.func2);
    await admin.post(`/solicitudes/${id}/asignar`).type('form').send({ responsable: f2 });
    expect(await estadoDe(id)).toBe('REABIERTA');
    await func2.post(`/solicitudes/${id}/estado`).type('form').send({ estado: 'EN_PROCESO' });
    expect(await estadoDe(id)).toBe('EN_PROCESO');
  });

  test('RN07: el historial conserva todos los movimientos y no se puede modificar', async () => {
    const { rows } = await db.query('SELECT COUNT(*)::int AS n FROM movimiento WHERE id_solicitud = $1', [id]);
    expect(rows[0].n).toBeGreaterThanOrEqual(9);
    await expect(db.query('UPDATE movimiento SET observacion = $1 WHERE id_solicitud = $2', ['x', id])).rejects.toThrow(/historial/i);
    await expect(db.query('DELETE FROM movimiento WHERE id_solicitud = $1', [id])).rejects.toThrow(/historial/i);
  });

  test('una solicitud RECHAZADA es final: no admite más cambios', async () => {
    const otra = await registrar(est);
    await admin.post(`/solicitudes/${otra}/estado`).type('form').send({ estado: 'RECHAZADA', texto: 'Fuera de alcance.' });
    expect(await estadoDe(otra)).toBe('RECHAZADA');
    await admin.post(`/solicitudes/${otra}/estado`).type('form').send({ estado: 'ASIGNADA' });
    expect(await estadoDe(otra)).toBe('RECHAZADA');
  });

  test('el supervisor consulta pero no puede cambiar estados', async () => {
    const sup = await sesion(CUENTAS.supervisor);
    expect((await sup.get(`/solicitudes/${id}`)).status).toBe(200);
    const r = await sup.post(`/solicitudes/${id}/estado`).type('form').send({ estado: 'RESUELTA', texto: 'x' });
    expect(r.status).toBe(403);
  });

  test('el listado se filtra por estado y los estudiantes solo ven las suyas', async () => {
    const propias = await est.get('/solicitudes');
    expect(propias.text).toContain('Mis solicitudes');
    const otro = await sesion(CUENTAS.est2);
    expect((await otro.get('/solicitudes')).text).not.toContain(`/solicitudes/${id}"`);
    const filtrado = await admin.get('/solicitudes?estado=RECHAZADA');
    expect(filtrado.text).toContain('Rechazada');
  });
});

describe('Administración de usuarios y categorías (RF03, RN12)', () => {
  let admin;
  beforeAll(async () => {
    admin = await sesion(CUENTAS.admin);
  });

  test('crea un usuario y rechaza un correo repetido', async () => {
    const datos = { nombre: 'Laura Gómez', correo: 'laura@unisolicita.edu', rol: 'FUNCIONARIO', contrasena: 'Clave2026x' };
    expect((await admin.post('/usuarios').type('form').send(datos)).status).toBe(302);
    const repetido = await admin.post('/usuarios').type('form').send(datos);
    expect(repetido.status).toBe(400);
    expect(repetido.text).toContain('Ya existe un usuario con ese correo');
  });

  test('exige contraseñas seguras', async () => {
    const r = await admin.post('/usuarios').type('form').send({ nombre: 'Otro Usuario', correo: 'otro@unisolicita.edu', rol: 'ESTUDIANTE', contrasena: '1234' });
    expect(r.status).toBe(400);
  });

  test('guarda la contraseña cifrada, nunca en texto plano', async () => {
    const { rows } = await db.query('SELECT contrasena_hash FROM usuario WHERE correo = $1', ['laura@unisolicita.edu']);
    expect(rows[0].contrasena_hash).toMatch(/^\$2[aby]\$/);
    expect(rows[0].contrasena_hash).not.toContain('Clave2026x');
  });

  test('no puede desactivarse a sí mismo', async () => {
    const miId = await idDe(CUENTAS.admin);
    await admin.post(`/usuarios/${miId}/activo`).type('form').send({ activo: 'false' });
    const { rows } = await db.query('SELECT activo FROM usuario WHERE id_usuario = $1', [miId]);
    expect(rows[0].activo).toBe(true);
  });

  test('una categoría desactivada no admite nuevas solicitudes', async () => {
    await admin.post('/categorias').type('form').send({ nombre: 'Categoría de prueba', descripcion: 'x' });
    const { rows } = await db.query("SELECT id_categoria AS id FROM categoria WHERE nombre = 'Categoría de prueba'");
    await admin.post(`/categorias/${rows[0].id}/activa`).type('form').send({ activa: 'false' });
    const est = await sesion(CUENTAS.est1);
    const r = await est.post('/solicitudes').type('form').send({ categoria: rows[0].id, prioridad: 'BAJA', descripcion: 'Descripción suficientemente larga' });
    expect(r.status).toBe(422);
  });
});

describe('Reportes (RF11)', () => {
  test('el reporte muestra totales y se exporta a CSV', async () => {
    const admin = await sesion(CUENTAS.admin);
    const pagina = await admin.get('/reportes');
    expect(pagina.status).toBe(200);
    expect(pagina.text).toContain('Por estado');
    const csv = await admin.get('/reportes/exportar.csv');
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.text.startsWith('﻿Código,Fecha,Solicitante')).toBe(true);
    expect(csv.text.split('\r\n').length).toBeGreaterThan(2);
  });

  test('los filtros de fecha limitan el resultado', async () => {
    const admin = await sesion(CUENTAS.admin);
    const vacio = await admin.get('/reportes?desde=2000-01-01&hasta=2000-01-02');
    expect(vacio.text).toContain('No hay solicitudes en el periodo seleccionado');
  });
});

describe('Protección CSRF', () => {
  test('un POST sin token es rechazado y con token es aceptado', async () => {
    const appCsrf = createApp({ db, config, csrf: true });
    const agente = request.agent(appCsrf);
    const pagina = await agente.get('/login');
    const token = pagina.text.match(/name="_csrf" value="([a-f0-9]+)"/)[1];

    const sinToken = await agente.post('/login').type('form').send({ correo: CUENTAS.est1, contrasena: CLAVE });
    expect(sinToken.status).toBe(403);
    const conToken = await agente.post('/login').type('form').send({ _csrf: token, correo: CUENTAS.est1, contrasena: CLAVE });
    expect(conToken.status).toBe(302);
  });
});

describe('Rendimiento (RNF)', () => {
  test('con 1000 solicitudes el listado y el reporte responden en menos de 2 s', async () => {
    await db.query(`
      INSERT INTO solicitud (codigo, id_solicitante, id_categoria, descripcion, prioridad)
      SELECT 'PERF-' || g, (SELECT id_usuario FROM usuario WHERE correo = $1), 1 + g % 6,
             'Solicitud de prueba de rendimiento número ' || g, 'MEDIA'
      FROM generate_series(1, 1000) g`, [CUENTAS.est1]);
    const admin = await sesion(CUENTAS.admin);
    for (const ruta of ['/solicitudes', '/reportes', '/panel']) {
      const t0 = Date.now();
      const r = await admin.get(ruta);
      expect(r.status).toBe(200);
      expect(Date.now() - t0).toBeLessThan(2000);
    }
  });
});
