'use strict';
/**
 * Genera solicitudes de demostración recorriendo el ciclo de vida real
 * (a través de los servicios, así se respetan todas las reglas) y luego
 * "envejece" las fechas para que los reportes tengan datos de varias semanas.
 */
const { crearRepos } = require('../repositories');
const { crearContenedor } = require('../container');

// Cada caso lleva su categoría para que la demostración tenga sentido.
const CASOS = [
  ['Certificados y constancias', 'Necesito un certificado de estudio con notas del último semestre para presentarlo en mi trabajo.'],
  ['Matrícula y registro', 'Quiero solicitar la cancelación de una asignatura porque se cruza con mi horario laboral.'],
  ['Soporte tecnológico', 'No puedo ingresar a la plataforma virtual desde hace tres días y tengo un parcial pendiente.'],
  ['Apoyo financiero', 'Solicito información sobre las opciones de financiación para el próximo semestre.'],
  ['Certificados y constancias', 'Requiero la constancia de matrícula vigente para tramitar un subsidio de transporte.'],
  ['Bienestar universitario', 'Quisiera reservar un espacio de orientación psicológica con bienestar universitario.'],
  ['Biblioteca y recursos', 'No encuentro en el catálogo el libro de la bibliografía de Ingeniería de Software.'],
  ['Matrícula y registro', 'Pido la homologación de dos materias cursadas en otra institución.'],
  ['Soporte tecnológico', 'Mi correo institucional no recibe mensajes y necesito restablecer el acceso.'],
  ['Apoyo financiero', 'Solicito una beca por rendimiento académico para el periodo siguiente.'],
  ['Matrícula y registro', 'Necesito corregir un error en mi nombre dentro del registro académico.'],
  ['Certificados y constancias', 'Quiero solicitar un duplicado del carné estudiantil porque lo perdí.'],
];

const FINALES = [
  'REGISTRADA', 'ASIGNADA', 'EN_PROCESO', 'RESUELTA', 'CERRADA', 'REABIERTA', 'RECHAZADA', 'OBSERVADA',
];
const PRIORIDADES = ['MEDIA', 'ALTA', 'BAJA', 'MEDIA', 'ALTA', 'BAJA'];

async function avanzar(c, admin, funcionario, id, destino) {
  const estado = (nombre, actor, texto) => c.solicitudes.cambiarEstado(actor, id, nombre, texto);
  if (destino === 'REGISTRADA') return;
  if (destino === 'RECHAZADA') {
    await estado('RECHAZADA', admin, 'La solicitud está fuera del alcance de los servicios en línea.');
    return;
  }
  await c.solicitudes.asignar(admin, id, { responsable: funcionario.id, observacion: '' });
  if (destino === 'ASIGNADA') return;
  await estado('EN_PROCESO', funcionario);
  if (destino === 'OBSERVADA') {
    await c.solicitudes.agregarObservacion(funcionario, id, 'Se solicitó información adicional al estudiante.');
    return;
  }
  if (destino === 'EN_PROCESO') return;
  await estado('RESUELTA', funcionario, 'Trámite realizado; el documento fue enviado al correo institucional.');
  if (destino === 'RESUELTA') return;
  await estado('CERRADA', admin, 'Cierre confirmado con el estudiante.');
  if (destino === 'CERRADA') return;
  await estado('REABIERTA', admin, 'El estudiante reporta que la solución no corresponde a lo pedido.');
}

/** Retrocede las fechas y reparte los movimientos en horas distintas (solo para datos demo). */
async function envejecer(db, ids) {
  await db.exec('ALTER TABLE movimiento DISABLE TRIGGER trg_movimiento_inmutable');
  try {
    for (const [i, id] of ids.entries()) {
      const dias = 7 + ((i * 3) % 45);
      await db.query(
        `UPDATE solicitud SET fecha_registro = now() - make_interval(days => $2) WHERE id_solicitud = $1`,
        [id, dias],
      );
      const { rows } = await db.query(
        'SELECT id_movimiento FROM movimiento WHERE id_solicitud = $1 ORDER BY id_movimiento',
        [id],
      );
      let horas = 0;
      for (const [j, fila] of rows.entries()) {
        horas += j === 0 ? 0 : 3 + ((i + j * 7) % 18);
        await db.query(
          `UPDATE movimiento SET fecha = (SELECT fecha_registro FROM solicitud WHERE id_solicitud = $1)
                                         + make_interval(hours => $3) WHERE id_movimiento = $2`,
          [id, fila.id_movimiento, horas],
        );
      }
      await db.query(
        `UPDATE notificacion SET fecha = (SELECT fecha_registro FROM solicitud WHERE id_solicitud = $1)
                                         + interval '1 hour' WHERE id_solicitud = $1`,
        [id],
      );
    }
  } finally {
    await db.exec('ALTER TABLE movimiento ENABLE TRIGGER trg_movimiento_inmutable');
  }
}

async function sembrarDemo(db, config, { cantidad = 24 } = {}) {
  const c = crearContenedor({ db, config });
  const repos = crearRepos(db);
  const estudiantes = await repos.usuarios.activosConRol('ESTUDIANTE');
  const [admin] = await repos.usuarios.administradoresActivos();
  const funcionarios = await repos.usuarios.funcionariosActivos();
  const categorias = await repos.categorias.listar({ soloActivas: true });
  if (!estudiantes.length || !admin || !funcionarios.length || !categorias.length) {
    throw new Error('Faltan usuarios o categorías base: ejecuta primero npm run db:init.');
  }

  const ids = [];
  for (let i = 0; i < cantidad; i += 1) {
    const [nombreCategoria, descripcion] = CASOS[i % CASOS.length];
    const categoria = categorias.find((x) => x.nombre === nombreCategoria) || categorias[i % categorias.length];
    const solicitud = await c.solicitudes.registrar(estudiantes[i % estudiantes.length], {
      categoria: categoria.id,
      prioridad: PRIORIDADES[i % PRIORIDADES.length],
      descripcion,
    });
    await avanzar(c, admin, funcionarios[i % funcionarios.length], solicitud.id, FINALES[(i + Math.floor(i / 2)) % FINALES.length]);
    ids.push(solicitud.id);
  }
  await envejecer(db, ids);
  return ids.length;
}

module.exports = { sembrarDemo };

if (require.main === module) {
  const config = require('../config');
  const { crearDb } = require('./index');
  const { inicializarSiVacia } = require('./migrate');
  (async () => {
    const db = await crearDb(config);
    await inicializarSiVacia(db);
    const n = await sembrarDemo(db, config);
    console.log(`Se crearon ${n} solicitudes de demostración.`);
    await db.cerrar();
  })().catch((error) => {
    console.error('No se pudieron crear los datos de demostración:', error.message);
    process.exit(1);
  });
}
