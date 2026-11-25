'use strict';
const request = require('supertest');
const config = require('../src/config');
const { crearDb, urlSinSslmode } = require('../src/db');
const { inicializar } = require('../src/db/migrate');
const { createApp } = require('../src/app');
const { asegurarAdministrador } = require('../src/db/primerAdmin');
const { CorreoService } = require('../src/services/CorreoService');
const { ROLES, ESTADOS_GUIA, guiaDeRol, ayudaEstado, pasosTour } = require('../src/content/guia');
const { ESTADOS } = require('../src/domain/estados');

const CLAVE = 'Demo1234*';
const APP_URL = 'https://unisolicita.test';
const CUENTAS = {
  ADMINISTRADOR: 'admin@unisolicita.edu',
  SUPERVISOR: 'supervisor@unisolicita.edu',
  FUNCIONARIO: 'funcionario1@unisolicita.edu',
  ESTUDIANTE: 'estudiante1@unisolicita.edu',
};

const desescapar = (t) =>
  t.replace(/&#34;|&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** Los correos salen después de responder: se espera a que el transporte los reciba. */
async function esperarCorreos(envio, minimo) {
  for (let i = 0; i < 50 && envio.mock.calls.length < minimo; i += 1) {
    await new Promise((r) => setTimeout(r, 10));
  }
  await new Promise((r) => setTimeout(r, 20));
  return envio.mock.calls.map((c) => c[0]);
}

let db;
let envio;
let log;
let app;

async function sesion(correo, clave = CLAVE, aplicacion = app) {
  const agente = request.agent(aplicacion);
  const r = await agente.post('/login').type('form').send({ correo, contrasena: clave });
  expect(r.status).toBe(302);
  return agente;
}

async function nuevaSolicitud(agente) {
  const r = await agente.post('/solicitudes').type('form').send({
    categoria: 1,
    prioridad: 'MEDIA',
    descripcion: 'Necesito un certificado de estudio con notas.',
  });
  expect(r.status).toBe(302);
  return Number(r.headers.location.split('/').pop());
}

const idDe = async (correo) =>
  (await db.query('SELECT id_usuario AS id FROM usuario WHERE correo = $1', [correo])).rows[0].id;

beforeAll(async () => {
  db = await crearDb({ pgliteDir: 'memory://', timezone: config.timezone });
  await inicializar(db);
  envio = jest.fn().mockResolvedValue({});
  log = { error: jest.fn() };
  const correo = new CorreoService({ smtp: { host: 'smtp.test', from: 'UniSolicita <no-responder@unisolicita.test>' }, appUrl: APP_URL, transporte: { sendMail: envio }, log });
  app = createApp({ db, config, csrf: false, correo });
});

afterAll(async () => {
  await db.cerrar();
});

beforeEach(() => {
  envio.mockClear();
  envio.mockResolvedValue({});
  log.error.mockClear();
});

describe('Correos de notificación', () => {
  test('al registrar: avisa a los administradores y confirma al estudiante', async () => {
    const est = await sesion(CUENTAS.ESTUDIANTE);
    const id = await nuevaSolicitud(est);
    const correos = await esperarCorreos(envio, 2);
    const destinos = correos.map((c) => c.to);
    expect(destinos).toEqual(expect.arrayContaining([CUENTAS.ADMINISTRADOR, CUENTAS.ESTUDIANTE]));
    expect(destinos).not.toContain(CUENTAS.SUPERVISOR);
    correos.forEach((c) => {
      expect(c.subject).toMatch(/^\[UniSolicita\] /);
      expect(c.from).toContain('no-responder@unisolicita.test');
      expect(c.text).toContain(`${APP_URL}/solicitudes/${id}`);
      expect(c.html).toContain(`${APP_URL}/solicitudes/${id}`);
    });
  });

  test('al asignar: avisa al responsable y al solicitante', async () => {
    const est = await sesion(CUENTAS.ESTUDIANTE);
    const admin = await sesion(CUENTAS.ADMINISTRADOR);
    const id = await nuevaSolicitud(est);
    await esperarCorreos(envio, 2);
    envio.mockClear();
    const f1 = await idDe(CUENTAS.FUNCIONARIO);
    await admin.post(`/solicitudes/${id}/asignar`).type('form').send({ responsable: f1 });
    const destinos = (await esperarCorreos(envio, 2)).map((c) => c.to);
    expect(destinos).toEqual(expect.arrayContaining([CUENTAS.FUNCIONARIO, CUENTAS.ESTUDIANTE]));
  });

  test('al cambiar de estado: avisa al solicitante; si se reabre, también al responsable', async () => {
    const est = await sesion(CUENTAS.ESTUDIANTE);
    const admin = await sesion(CUENTAS.ADMINISTRADOR);
    const func = await sesion(CUENTAS.FUNCIONARIO);
    const id = await nuevaSolicitud(est);
    await admin.post(`/solicitudes/${id}/asignar`).type('form').send({ responsable: await idDe(CUENTAS.FUNCIONARIO) });
    await func.post(`/solicitudes/${id}/estado`).type('form').send({ estado: 'EN_PROCESO' });
    await func.post(`/solicitudes/${id}/estado`).type('form').send({ estado: 'RESUELTA', texto: 'Certificado enviado.' });
    await admin.post(`/solicitudes/${id}/estado`).type('form').send({ estado: 'CERRADA', texto: 'Confirmado.' });
    await esperarCorreos(envio, 8);
    envio.mockClear();

    await admin.post(`/solicitudes/${id}/estado`).type('form').send({ estado: 'REABIERTA', texto: 'No era lo solicitado.' });
    const destinos = (await esperarCorreos(envio, 2)).map((c) => c.to);
    expect(destinos).toEqual(expect.arrayContaining([CUENTAS.ESTUDIANTE, CUENTAS.FUNCIONARIO]));
  });

  test('si el servidor de correo falla, el trámite igual se registra', async () => {
    envio.mockRejectedValue(new Error('SMTP caído'));
    const est = await sesion(CUENTAS.ESTUDIANTE);
    const id = await nuevaSolicitud(est);
    await esperarCorreos(envio, 2);
    expect(id).toBeGreaterThan(0);
    expect(log.error).toHaveBeenCalled();
    const r = await est.get(`/solicitudes/${id}`);
    expect(r.status).toBe(200);
  });

  test('sin SMTP configurado no se envía nada y el sistema funciona con avisos internos', async () => {
    const sinCorreo = createApp({ db, config, csrf: false, correo: new CorreoService({}) });
    const est = await sesion(CUENTAS.ESTUDIANTE, CLAVE, sinCorreo);
    await nuevaSolicitud(est);
    await new Promise((r) => setTimeout(r, 50));
    expect(envio).not.toHaveBeenCalled();
    const avisos = await est.get('/notificaciones');
    expect(avisos.status).toBe(200);
  });

  test('CorreoService: escapa el contenido en el HTML y no envía sin destinatario', async () => {
    const servicio = new CorreoService({ smtp: { host: 'x', from: 'a@b.co' }, transporte: { sendMail: envio }, log });
    expect(await servicio.enviar({ para: '', asunto: 'a', texto: 'b' })).toBe(false);
    expect(await servicio.enviar({ para: 'a@b.co', asunto: 'a', nombre: 'Ana Pérez', texto: '<script>alert(1)</script>' })).toBe(true);
    const enviado = envio.mock.calls[0][0];
    expect(enviado.html).not.toContain('<script>');
    expect(enviado.html).toContain('&lt;script&gt;');
    expect(enviado.text).toContain('Hola, Ana');
  });
});

describe('Mi cuenta · cambio de contraseña', () => {
  const enviar = (agente, datos) => agente.post('/cuenta/contrasena').type('form').send(datos);

  test('exige sesión', async () => {
    const r = await request(app).get('/cuenta');
    expect(r.status).toBe(302);
    expect(r.headers.location).toBe('/login');
  });

  test('muestra los datos de la persona', async () => {
    const est = await sesion(CUENTAS.ESTUDIANTE);
    const r = await est.get('/cuenta');
    expect(r.status).toBe(200);
    expect(r.text).toContain(CUENTAS.ESTUDIANTE);
    expect(r.text).toContain('Cambiar contraseña');
  });

  test.each([
    ['la actual es incorrecta', { actual: 'Otra1234*', nueva: 'Nueva1234*', confirmar: 'Nueva1234*' }, 'contraseña actual no es correcta'],
    ['la confirmación no coincide', { actual: CLAVE, nueva: 'Nueva1234*', confirmar: 'Distinta99*' }, 'no coincide'],
    ['la nueva es igual a la actual', { actual: CLAVE, nueva: CLAVE, confirmar: CLAVE }, 'distinta de la actual'],
    ['la nueva es débil', { actual: CLAVE, nueva: 'corta', confirmar: 'corta' }, '8 caracteres'],
  ])('se rechaza cuando %s', async (_n, datos, mensaje) => {
    const est = await sesion(CUENTAS.ESTUDIANTE);
    const r = await enviar(est, datos);
    expect(r.status).toBe(400);
    expect(desescapar(r.text)).toContain(mensaje);
    await sesion(CUENTAS.ESTUDIANTE); // la clave sigue siendo la de antes
  });

  test('con datos correctos cambia la clave: la vieja deja de servir y la nueva entra', async () => {
    const est = await sesion('estudiante2@unisolicita.edu');
    const r = await enviar(est, { actual: CLAVE, nueva: 'MiClave2026', confirmar: 'MiClave2026' });
    expect(r.status).toBe(302);
    const vieja = await request(app).post('/login').type('form').send({ correo: 'estudiante2@unisolicita.edu', contrasena: CLAVE });
    expect(vieja.status).toBe(401);
    await sesion('estudiante2@unisolicita.edu', 'MiClave2026');
  });
});

describe('Primer administrador y modo producción', () => {
  let limpia;
  beforeAll(async () => {
    limpia = await crearDb({ pgliteDir: 'memory://', timezone: config.timezone });
    await inicializar(limpia, { usuariosDemo: false });
  });
  afterAll(async () => {
    await limpia.cerrar();
  });

  test('sin cuentas de demostración la base queda sin usuarios', async () => {
    const { rows } = await limpia.query('SELECT COUNT(*)::int AS n FROM usuario');
    expect(rows[0].n).toBe(0);
    const { rows: cats } = await limpia.query('SELECT COUNT(*)::int AS n FROM categoria');
    expect(cats[0].n).toBeGreaterThan(0);
  });

  test('sin datos de administrador no crea nada', async () => {
    expect(await asegurarAdministrador(limpia, { nombre: 'X', correo: '', clave: '' })).toBeNull();
  });

  test('crea el administrador real una sola vez y puede iniciar sesión', async () => {
    const datos = { nombre: 'Oficina de Registro', correo: 'registro@cul.edu.co', clave: 'ClaveSegura26' };
    const creado = await asegurarAdministrador(limpia, datos);
    expect(creado).toBeTruthy();
    expect(await asegurarAdministrador(limpia, { ...datos, correo: 'otro@cul.edu.co' })).toBeNull();
    const { rows } = await limpia.query('SELECT COUNT(*)::int AS n FROM usuario');
    expect(rows[0].n).toBe(1);
    const aplicacion = createApp({ db: limpia, config, csrf: false });
    const admin = await sesion(datos.correo, datos.clave, aplicacion);
    const r = await admin.get('/usuarios');
    expect(r.status).toBe(200);
  });
});

describe('Guía de uso dentro del sistema', () => {
  test('/ayuda exige sesión', async () => {
    const r = await request(app).get('/ayuda');
    expect(r.status).toBe(302);
  });

  test.each(ROLES)('/ayuda muestra la guía propia del rol %s', async (rol) => {
    const agente = await sesion(CUENTAS[rol]);
    const r = await agente.get('/ayuda');
    expect(r.status).toBe(200);
    const texto = desescapar(r.text);
    expect(texto).toContain(guiaDeRol(rol).resumen);
    guiaDeRol(rol).tareas.forEach((t) => expect(texto).toContain(t.titulo));
    ESTADOS_GUIA.forEach((e) => expect(texto).toContain(e.significa));
  });

  test('cualquiera puede consultar la guía de otro rol con ?rol=', async () => {
    const est = await sesion(CUENTAS.ESTUDIANTE);
    const r = await est.get('/ayuda?rol=ADMINISTRADOR');
    expect(r.status).toBe(200);
    expect(desescapar(r.text)).toContain(guiaDeRol('ADMINISTRADOR').resumen);
    const invalido = await est.get('/ayuda?rol=HACKER');
    expect(desescapar(invalido.text)).toContain(guiaDeRol('ESTUDIANTE').resumen);
  });

  test('el panel incluye los pasos del recorrido guiado de cada rol', async () => {
    for (const rol of ROLES) {
      const agente = await sesion(CUENTAS[rol]);
      const r = await agente.get('/panel');
      const m = r.text.match(/id="guia-datos"[^>]*data-pasos="([^"]*)"/) || r.text.match(/data-pasos="([^"]*)"[^>]*id="guia-datos"/);
      expect(m).not.toBeNull();
      const pasos = JSON.parse(desescapar(m[1]));
      expect(pasos).toEqual(pasosTour(rol));
      expect(pasos.length).toBeGreaterThan(3);
      pasos.forEach((p) => {
        expect(p.titulo).toBeTruthy();
        expect(p.texto).toBeTruthy();
      });
      expect(r.text).toContain('/js/guia.js');
    }
  });

  test('cada rol tiene explicación para cada estado de una solicitud', () => {
    ROLES.forEach((rol) => ESTADOS_GUIA.forEach((e) => expect(ayudaEstado(rol, e.nombre)).toBeTruthy()));
  });

  test('el detalle de la solicitud explica el estado actual según el rol', async () => {
    const est = await sesion(CUENTAS.ESTUDIANTE);
    const id = await nuevaSolicitud(est);
    const admin = await sesion(CUENTAS.ADMINISTRADOR);
    const comoEstudiante = desescapar((await est.get(`/solicitudes/${id}`)).text);
    const comoAdmin = desescapar((await admin.get(`/solicitudes/${id}`)).text);
    expect(comoEstudiante).toContain(ayudaEstado('ESTUDIANTE', 'REGISTRADA'));
    expect(comoAdmin).toContain(ayudaEstado('ADMINISTRADOR', 'REGISTRADA'));
    expect(comoAdmin).not.toContain(ayudaEstado('ESTUDIANTE', 'REGISTRADA'));
  });

  test('la guía del administrador explica asignar, reasignar, rechazar, cerrar y reabrir', () => {
    const guia = guiaDeRol('ADMINISTRADOR');
    const titulos = guia.tareas.map((t) => t.titulo).join(' | ');
    ['Asignar', 'reasignar', 'Rechazar (cancelar)', 'Cerrar', 'Reabrir', 'Crear un usuario', 'reportes'].forEach((palabra) =>
      expect(titulos.toLowerCase()).toContain(palabra.toLowerCase()),
    );
    expect(guia.faq.some(([pregunta]) => pregunta.includes('cancelo'))).toBe(true);
  });

  test('lo que la guía del administrador dice coincide con las reglas del sistema', () => {
    const admin = { rol: 'ADMINISTRADOR', id: 1 };
    const estados = Object.values(ESTADOS);
    const etiquetas = (lista) => lista.map((e) => `«${e.etiqueta}»`);
    const rechazables = estados.filter((e) => e.transiciones().some((t) => t.hacia === 'RECHAZADA' && t.permiteA(admin, {})));
    const reasignables = estados.filter((e) => e.permiteReasignar());
    expect(rechazables.map((e) => e.nombre)).toEqual(['REGISTRADA', 'ASIGNADA']);
    expect(reasignables.map((e) => e.nombre)).toEqual(['ASIGNADA', 'EN_PROCESO', 'REABIERTA']);
    const tareas = Object.fromEntries(guiaDeRol('ADMINISTRADOR').tareas.map((t) => [t.titulo, t.pasos.join(' ')]));
    const rechazo = tareas['Rechazar (cancelar) una solicitud'];
    expect(rechazo).toContain(`${etiquetas(rechazables)[0]} o ${etiquetas(rechazables)[1]}`);
    const reasignar = tareas['Cambiar de responsable (reasignar)'];
    const [a, b, c] = etiquetas(reasignables);
    expect(reasignar).toContain(`${a}, ${b} o ${c}`);
  });

  test('el detalle de la solicitud incluye la ayuda de la pantalla con los botones de cada rol', async () => {
    const est = await sesion(CUENTAS.ESTUDIANTE);
    const id = await nuevaSolicitud(est);
    const admin = await sesion(CUENTAS.ADMINISTRADOR);
    const comoAdmin = desescapar((await admin.get(`/solicitudes/${id}`)).text);
    expect(comoAdmin).toContain('data-ayuda="detalle"');
    expect(comoAdmin).toContain('¿Cómo funciona esta pantalla?');
    expect(comoAdmin).toContain('«Rechazar» (cancelar)');
    const comoEstudiante = desescapar((await est.get(`/solicitudes/${id}`)).text);
    expect(comoEstudiante).toContain('data-ayuda="detalle"');
    expect(comoEstudiante).not.toContain('«Rechazar» (cancelar)');
  });

  test.each(ROLES)('ninguna pantalla falla con error de servidor para %s', async (rol) => {
    const agente = await sesion(CUENTAS[rol]);
    const rutas = ['/panel', '/ayuda', '/cuenta', '/solicitudes', '/solicitudes/nueva', '/notificaciones', '/usuarios', '/usuarios/nuevo', '/categorias', '/reportes'];
    for (const ruta of rutas) {
      const r = await agente.get(ruta);
      expect([ruta, r.status < 500]).toEqual([ruta, true]);
    }
  });
});

describe('Conexión a PostgreSQL con SSL', () => {
  test('quita sslmode de la URL para que mande PGSSL y conserva el resto', () => {
    expect(urlSinSslmode('postgresql://u:p%40ss@ep-x.neon.tech/db?sslmode=require')).toBe('postgresql://u:p%40ss@ep-x.neon.tech/db');
    expect(urlSinSslmode('postgresql://u:p@h:5432/db?sslmode=require&application_name=app')).toBe('postgresql://u:p@h:5432/db?application_name=app');
    expect(urlSinSslmode('postgresql://u:p@h:5432/db')).toBe('postgresql://u:p@h:5432/db');
    expect(urlSinSslmode('no es una url')).toBe('no es una url');
  });
});

describe('Avisos en vivo (sonido y cartel)', () => {
  test('exige sesión', async () => {
    const r = await request(app).get('/notificaciones/novedades');
    expect(r.status).toBe(302);
    expect(r.headers.location).toBe('/login');
  });

  test('devuelve solo los avisos nuevos no leídos de la persona, sin guardarlos en caché', async () => {
    const est = await sesion(CUENTAS.ESTUDIANTE);
    const admin = await sesion(CUENTAS.ADMINISTRADOR);
    const base = (await admin.get('/notificaciones/novedades')).body;
    expect(base).toEqual(expect.objectContaining({ sinLeer: expect.any(Number), ultimoId: expect.any(Number), nuevas: expect.any(Array) }));

    const id = await nuevaSolicitud(est);
    const r = await admin.get(`/notificaciones/novedades?desde=${base.ultimoId}`);
    expect(r.status).toBe(200);
    expect(r.headers['cache-control']).toContain('no-store');
    expect(r.body.nuevas.length).toBeGreaterThanOrEqual(1);
    expect(r.body.nuevas.every((n) => n.id > base.ultimoId && n.solicitud && n.codigo && n.mensaje)).toBe(true);
    expect(r.body.nuevas.some((n) => n.solicitud === id)).toBe(true);
    expect(r.body.sinLeer).toBe(base.sinLeer + r.body.nuevas.length);

    const alDia = await admin.get(`/notificaciones/novedades?desde=${r.body.ultimoId}`);
    expect(alDia.body.nuevas).toEqual([]);
  });

  test('no mezcla los avisos de otra persona y respeta el límite de cinco', async () => {
    const est = await sesion(CUENTAS.ESTUDIANTE);
    const func = await sesion(CUENTAS.FUNCIONARIO);
    const antes = (await func.get('/notificaciones/novedades')).body;
    for (let i = 0; i < 7; i += 1) await nuevaSolicitud(est);
    const deFunc = (await func.get(`/notificaciones/novedades?desde=${antes.ultimoId}`)).body;
    expect(deFunc.nuevas).toEqual([]); // los registros avisan a los administradores, no a un funcionario
    const admin = await sesion(CUENTAS.ADMINISTRADOR);
    const deAdmin = (await admin.get('/notificaciones/novedades?desde=0')).body;
    expect(deAdmin.nuevas.length).toBe(5);
  });

  test('un valor de "desde" inválido se trata como cero', async () => {
    const admin = await sesion(CUENTAS.ADMINISTRADOR);
    const r = await admin.get('/notificaciones/novedades?desde=abc');
    expect(r.status).toBe(200);
  });

  test('las páginas cargan el script y el botón para silenciar el sonido', async () => {
    const est = await sesion(CUENTAS.ESTUDIANTE);
    const r = await est.get('/panel');
    expect(r.text).toContain('/js/avisos.js');
    expect(r.text).toContain('id="avisos-sonido"');
    const login = await request(app).get('/login');
    expect(login.text).not.toContain('/js/avisos.js');
  });
});
