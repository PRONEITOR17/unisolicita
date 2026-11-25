'use strict';
const { crearRepos } = require('../repositories');
const {
  AccesoDenegadoError,
  NoEncontradoError,
  ReglaNegocioError,
  ValidationError,
} = require('../errors');
const validar = require('./validar');

class SolicitudService {
  constructor({ db, bus }) {
    this.db = db;
    this.bus = bus;
  }

  /** RN08: restringe los listados a lo que cada rol puede ver. */
  _alcance(actor, filtros = {}) {
    const alcance = { ...filtros };
    if (actor.rol === 'ESTUDIANTE') alcance.idSolicitante = actor.id;
    if (actor.rol === 'FUNCIONARIO') alcance.idResponsable = actor.id;
    return alcance;
  }

  listar(actor, entrada) {
    const filtros = this._alcance(actor, validar.filtros(entrada));
    return crearRepos(this.db).solicitudes.listar(filtros);
  }

  resumen(actor) {
    return crearRepos(this.db).solicitudes.contarPorEstado(this._alcance(actor));
  }

  /** Detalle con historial y las acciones que el actor puede ejecutar. */
  async obtener(actor, id) {
    const repos = crearRepos(this.db);
    const solicitud = await repos.solicitudes.porId(id);
    if (!solicitud) throw new NoEncontradoError('La solicitud no existe.');
    if (!solicitud.puedeVer(actor)) throw new AccesoDenegadoError();
    const puedeAsignar = solicitud.puedeAsignar(actor);
    return {
      solicitud,
      movimientos: await repos.movimientos.porSolicitud(id),
      acciones: solicitud.accionesDisponibles(actor),
      puedeAsignar,
      puedeObservar: solicitud.puedeObservar(actor),
      funcionarios: puedeAsignar ? await repos.usuarios.funcionariosActivos() : [],
    };
  }

  /** RF04 · RN01, RN02, RN03, RN10 */
  async registrar(actor, entrada) {
    if (actor.rol !== 'ESTUDIANTE') {
      throw new AccesoDenegadoError('Solo los estudiantes pueden registrar solicitudes.');
    }
    const descripcion = validar.requerido(entrada.descripcion, 'La descripción', { min: 10, max: 2000 });
    const prioridad = validar.prioridad(entrada.prioridad);
    const idCategoria = validar.entero(entrada.categoria);
    if (!idCategoria) throw new ValidationError('Elige una categoría.');

    const despues = [];
    const registrada = await this.db.tx(async (tx) => {
      const repos = crearRepos(tx);
      const categoria = await repos.categorias.porId(idCategoria);
      if (!categoria || !categoria.activa) {
        throw new ReglaNegocioError('La categoría elegida no existe o está desactivada.');
      }
      const solicitud = await repos.solicitudes.crear({
        idSolicitante: actor.id,
        idCategoria,
        descripcion,
        prioridad,
      });
      await repos.movimientos.registrar({
        idSolicitud: solicitud.id,
        idUsuario: actor.id,
        tipo: 'ESTADO',
        estadoAnterior: null,
        estadoNuevo: 'REGISTRADA',
        observacion: 'Solicitud registrada.',
      });
      await this.bus.emitir('solicitud.registrada', { repos, solicitud, actor, despues });
      return solicitud;
    });
    this._despachar(despues);
    return registrada;
  }

  /** RF12 · RN04: asigna (REGISTRADA -> ASIGNADA) o reasigna sin cambiar el estado. */
  async asignar(actor, id, entrada) {
    if (actor.rol !== 'ADMINISTRADOR') throw new AccesoDenegadoError();
    const idResponsable = validar.entero(entrada.responsable);
    if (!idResponsable) throw new ValidationError('Elige un funcionario.');
    const observacion = validar.texto(entrada.observacion).slice(0, 500);

    const despues = [];
    const asignada = await this.db.tx(async (tx) => {
      const repos = crearRepos(tx);
      const solicitud = await this._cargarBloqueada(repos, id);
      if (!solicitud.puedeAsignar(actor)) {
        throw new ReglaNegocioError(
          `No se puede asignar una solicitud en estado "${solicitud.estado.etiqueta}".`,
        );
      }
      const responsable = await repos.usuarios.porId(idResponsable);
      if (!responsable || !responsable.activo || responsable.rol !== 'FUNCIONARIO') {
        throw new ReglaNegocioError('El responsable debe ser un funcionario activo.');
      }
      const primeraAsignacion = solicitud.estado.nombre === 'REGISTRADA';
      const estadoNuevo = primeraAsignacion ? 'ASIGNADA' : solicitud.estado.nombre;
      await repos.solicitudes.actualizar(id, { estado: estadoNuevo, idResponsable });
      await repos.movimientos.registrar({
        idSolicitud: id,
        idUsuario: actor.id,
        tipo: 'ASIGNACION',
        estadoAnterior: solicitud.estado.nombre,
        estadoNuevo,
        observacion: `Responsable: ${responsable.nombre}.${observacion ? ` ${observacion}` : ''}`,
      });
      const actualizada = await repos.solicitudes.porId(id);
      const datos = { repos, solicitud: actualizada, actor, despues };
      await this.bus.emitir('solicitud.asignada', datos);
      if (primeraAsignacion) await this.bus.emitir('solicitud.estado', datos);
      return actualizada;
    });
    this._despachar(despues);
    return asignada;
  }

  /** RF07 · RN05, RN06, RN07, RN09, RN11: cambio de estado respetando el patrón State. */
  async cambiarEstado(actor, id, hacia, textoEntrada) {
    const destino = validar.texto(hacia).toUpperCase();
    if (destino === 'ASIGNADA') throw new ValidationError('Para asignar usa la opción "Asignar".');
    const texto = validar.texto(textoEntrada).slice(0, 2000);

    const despues = [];
    const cambiada = await this.db.tx(async (tx) => {
      const repos = crearRepos(tx);
      const solicitud = await this._cargarBloqueada(repos, id);
      const transicion = solicitud.validarTransicion(destino, actor, texto);
      await repos.solicitudes.actualizar(id, {
        estado: destino,
        solucion: destino === 'RESUELTA' ? texto : null,
      });
      await repos.movimientos.registrar({
        idSolicitud: id,
        idUsuario: actor.id,
        tipo: 'ESTADO',
        estadoAnterior: solicitud.estado.nombre,
        estadoNuevo: destino,
        observacion: texto || transicion.porDefecto,
      });
      const actualizada = await repos.solicitudes.porId(id);
      await this.bus.emitir('solicitud.estado', { repos, solicitud: actualizada, actor, despues });
      return actualizada;
    });
    this._despachar(despues);
    return cambiada;
  }

  /** RF08: observaciones del funcionario mientras atiende (no cambian el estado). */
  async agregarObservacion(actor, id, textoEntrada) {
    const texto = validar.requerido(textoEntrada, 'La observación', { max: 2000 });
    return this.db.tx(async (tx) => {
      const repos = crearRepos(tx);
      const solicitud = await this._cargarBloqueada(repos, id);
      if (actor.rol !== 'FUNCIONARIO' || solicitud.idResponsable !== actor.id) {
        throw new AccesoDenegadoError();
      }
      if (!solicitud.estado.permiteObservacion()) {
        throw new ReglaNegocioError('Solo puedes agregar observaciones mientras la solicitud está en proceso.');
      }
      await repos.movimientos.registrar({
        idSolicitud: id,
        idUsuario: actor.id,
        tipo: 'OBSERVACION',
        estadoAnterior: solicitud.estado.nombre,
        estadoNuevo: solicitud.estado.nombre,
        observacion: texto,
      });
    });
  }

  /** Los correos salen ya confirmada la transacción y sin hacer esperar la respuesta al usuario. */
  _despachar(despues) {
    if (despues.length) {
      Promise.allSettled(despues.map((enviar) => Promise.resolve().then(enviar)));
    }
  }

  async _cargarBloqueada(repos, id) {
    const solicitud = await repos.solicitudes.porId(id, { bloquear: true });
    if (!solicitud) throw new NoEncontradoError('La solicitud no existe.');
    return solicitud;
  }
}

module.exports = { SolicitudService };
