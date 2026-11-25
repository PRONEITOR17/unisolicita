'use strict';
const { obtenerEstado } = require('./estados');

/**
 * Patrón Observer: los servicios publican eventos de negocio y los observadores
 * (aquí, el notificador interno) reaccionan sin que el servicio los conozca.
 */
class EventBus {
  constructor() {
    this.observadores = new Map();
  }

  suscribir(evento, observador) {
    if (!this.observadores.has(evento)) this.observadores.set(evento, []);
    this.observadores.get(evento).push(observador);
  }

  async emitir(evento, datos) {
    for (const observador of this.observadores.get(evento) || []) {
      await observador(datos);
    }
  }
}

/**
 * RN13: notificaciones internas al registrar, asignar y cambiar de estado.
 * Si hay un servicio de correo habilitado, cada aviso sale también por correo, pero solo después de
 * confirmar la transacción: los observadores dejan sus envíos en datos.despues y el servicio los ejecuta.
 */
function registrarNotificador(bus, correo = null) {
  const programarCorreo = (datos, usuario, solicitud, mensaje) => {
    if (!correo || !correo.habilitado || !datos.despues || !usuario || !usuario.correo) return;
    datos.despues.push(() =>
      correo.enviar({
        para: usuario.correo,
        nombre: usuario.nombre,
        asunto: mensaje,
        texto: mensaje,
        enlace: correo.enlaceSolicitud(solicitud.id),
      }),
    );
  };

  const avisar = async (datos, usuario, mensaje) => {
    await datos.repos.notificaciones.crear({
      idUsuario: usuario.id,
      idSolicitud: datos.solicitud.id,
      mensaje,
    });
    programarCorreo(datos, usuario, datos.solicitud, mensaje);
  };

  bus.suscribir('solicitud.registrada', async (datos) => {
    const { repos, solicitud, actor } = datos;
    const administradores = await repos.usuarios.administradoresActivos();
    for (const admin of administradores) {
      await avisar(datos, admin, `Nueva solicitud ${solicitud.codigo} (${solicitud.categoria}) por asignar.`);
    }
    // Confirmación para quien la registró (solo por correo: él ya ve su solicitud en pantalla)
    programarCorreo(
      datos,
      actor,
      solicitud,
      `Recibimos tu solicitud ${solicitud.codigo} (${solicitud.categoria}). Te avisaremos cada vez que cambie de estado.`,
    );
  });

  bus.suscribir('solicitud.asignada', async (datos) => {
    const { repos, solicitud } = datos;
    const responsable = await repos.usuarios.porId(solicitud.idResponsable);
    await avisar(datos, responsable, `Se te asignó la solicitud ${solicitud.codigo} (${solicitud.categoria}).`);
  });

  bus.suscribir('solicitud.estado', async (datos) => {
    const { repos, solicitud } = datos;
    const estado = obtenerEstado(solicitud.estado.nombre).etiqueta;
    const solicitante = await repos.usuarios.porId(solicitud.idSolicitante);
    await avisar(datos, solicitante, `Tu solicitud ${solicitud.codigo} cambió a "${estado}".`);
    if (solicitud.estado.nombre === 'REABIERTA' && solicitud.idResponsable) {
      const responsable = await repos.usuarios.porId(solicitud.idResponsable);
      await avisar(datos, responsable, `La solicitud ${solicitud.codigo} fue reabierta y requiere tu atención.`);
    }
  });
}

module.exports = { EventBus, registrarNotificador };
