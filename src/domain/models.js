'use strict';
const { obtenerEstado } = require('./estados');
const { AccesoDenegadoError, ReglaNegocioError, ValidationError } = require('../errors');

const ROLES = ['ADMINISTRADOR', 'ESTUDIANTE', 'FUNCIONARIO', 'SUPERVISOR'];
const PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA'];

class Usuario {
  constructor(fila) {
    this.id = fila.id_usuario;
    this.nombre = fila.nombre;
    this.correo = fila.correo;
    this.hash = fila.contrasena_hash;
    this.idRol = fila.id_rol;
    this.rol = fila.rol;
    this.activo = fila.activo;
    this.fechaCreacion = fila.fecha_creacion;
  }

  tieneRol(...roles) {
    return roles.includes(this.rol);
  }
}

class Categoria {
  constructor(fila) {
    this.id = fila.id_categoria;
    this.nombre = fila.nombre;
    this.descripcion = fila.descripcion;
    this.activa = fila.activa;
  }
}

class Movimiento {
  constructor(fila) {
    this.id = fila.id_movimiento;
    this.idSolicitud = fila.id_solicitud;
    this.idUsuario = fila.id_usuario;
    this.usuario = fila.usuario;
    this.rolUsuario = fila.rol_usuario;
    this.fecha = fila.fecha;
    this.tipo = fila.tipo;
    this.estadoAnterior = fila.estado_anterior;
    this.estadoNuevo = fila.estado_nuevo;
    this.observacion = fila.observacion;
  }
}

class Notificacion {
  constructor(fila) {
    this.id = fila.id_notificacion;
    this.idUsuario = fila.id_usuario;
    this.idSolicitud = fila.id_solicitud;
    this.codigo = fila.codigo;
    this.mensaje = fila.mensaje;
    this.fecha = fila.fecha;
    this.leida = fila.leida;
  }
}

class Solicitud {
  constructor(fila) {
    this.id = fila.id_solicitud;
    this.codigo = fila.codigo;
    this.fechaRegistro = fila.fecha_registro;
    this.idSolicitante = fila.id_solicitante;
    this.solicitante = fila.solicitante;
    this.idCategoria = fila.id_categoria;
    this.categoria = fila.categoria;
    this.descripcion = fila.descripcion;
    this.prioridad = fila.prioridad;
    this.idResponsable = fila.id_responsable;
    this.responsable = fila.responsable;
    this.solucion = fila.solucion;
    this.estado = obtenerEstado(fila.estado); // objeto State
  }

  /** RN08: el estudiante ve las suyas, el funcionario las asignadas; admin y supervisor, todas. */
  puedeVer(actor) {
    if (actor.tieneRol('ADMINISTRADOR', 'SUPERVISOR')) return true;
    if (actor.rol === 'ESTUDIANTE') return this.idSolicitante === actor.id;
    return actor.rol === 'FUNCIONARIO' && this.idResponsable === actor.id;
  }

  /** Cambios de estado que el actor puede hacer ahora (sin incluir la asignación). */
  accionesDisponibles(actor) {
    return this.estado
      .transiciones()
      .filter((t) => t.hacia !== 'ASIGNADA' && t.permiteA(actor, this));
  }

  puedeAsignar(actor) {
    return (
      actor.rol === 'ADMINISTRADOR' &&
      (this.estado.nombre === 'REGISTRADA' || this.estado.permiteReasignar())
    );
  }

  puedeObservar(actor) {
    return (
      actor.rol === 'FUNCIONARIO' &&
      this.idResponsable === actor.id &&
      this.estado.permiteObservacion()
    );
  }

  /** RN06 y RN09: valida que la transición exista, que el actor pueda y que traiga el texto exigido. */
  validarTransicion(hacia, actor, texto) {
    const transicion = this.estado.buscar(hacia);
    if (!transicion) {
      const destino = obtenerEstado(hacia).etiqueta;
      throw new ReglaNegocioError(
        `No se puede pasar de "${this.estado.etiqueta}" a "${destino}".`,
      );
    }
    if (!transicion.permiteA(actor, this)) throw new AccesoDenegadoError();
    if (transicion.campo && !String(texto || '').trim()) {
      throw new ValidationError(`${transicion.etiquetaCampo} es obligatorio.`);
    }
    return transicion;
  }
}

module.exports = { Usuario, Categoria, Movimiento, Notificacion, Solicitud, ROLES, PRIORIDADES };
