'use strict';
/**
 * Patrón State: cada estado del ciclo de vida de una solicitud es una clase
 * que sabe a qué estados puede pasar, quién puede hacerlo y qué texto exige.
 *
 *  REGISTRADA -> ASIGNADA -> EN_PROCESO -> RESUELTA -> CERRADA -> REABIERTA -> EN_PROCESO
 *  REGISTRADA / ASIGNADA -> RECHAZADA (estado final)
 */
const ADMIN = 'ADMINISTRADOR';
const RESPONSABLE = 'RESPONSABLE'; // el funcionario asignado a la solicitud

class Transicion {
  /**
   * @param {string} hacia      estado de destino
   * @param {string[]} quienes  ADMINISTRADOR y/o RESPONSABLE
   * @param {object} opciones   etiqueta del botón, campo de texto obligatorio, texto por defecto
   */
  constructor(hacia, quienes, { etiqueta, campo = null, etiquetaCampo = '', porDefecto = '' }) {
    this.hacia = hacia;
    this.quienes = quienes;
    this.etiqueta = etiqueta;
    this.campo = campo; // 'motivo' | 'solucion' | 'observacion' | null (opcional)
    this.etiquetaCampo = etiquetaCampo;
    this.porDefecto = porDefecto;
  }

  permiteA(actor, solicitud) {
    if (actor.rol === 'ADMINISTRADOR' && this.quienes.includes(ADMIN)) return true;
    return (
      actor.rol === 'FUNCIONARIO' &&
      this.quienes.includes(RESPONSABLE) &&
      solicitud.idResponsable === actor.id
    );
  }
}

class EstadoSolicitud {
  constructor(nombre, etiqueta) {
    this.nombre = nombre;
    this.etiqueta = etiqueta;
  }

  transiciones() {
    return [];
  }

  buscar(hacia) {
    return this.transiciones().find((t) => t.hacia === hacia) || null;
  }

  esFinal() {
    return this.transiciones().length === 0;
  }

  permiteReasignar() {
    return false;
  }

  permiteObservacion() {
    return false;
  }
}

class Registrada extends EstadoSolicitud {
  constructor() {
    super('REGISTRADA', 'Registrada');
  }

  transiciones() {
    return [
      new Transicion('ASIGNADA', [ADMIN], { etiqueta: 'Asignar' }),
      new Transicion('RECHAZADA', [ADMIN], {
        etiqueta: 'Rechazar',
        campo: 'motivo',
        etiquetaCampo: 'Motivo del rechazo',
      }),
    ];
  }
}

class Asignada extends EstadoSolicitud {
  constructor() {
    super('ASIGNADA', 'Asignada');
  }

  transiciones() {
    return [
      new Transicion('EN_PROCESO', [RESPONSABLE], {
        etiqueta: 'Iniciar atención',
        porDefecto: 'Atención iniciada.',
      }),
      new Transicion('RECHAZADA', [ADMIN, RESPONSABLE], {
        etiqueta: 'Rechazar',
        campo: 'motivo',
        etiquetaCampo: 'Motivo del rechazo',
      }),
    ];
  }

  permiteReasignar() {
    return true;
  }
}

class EnProceso extends EstadoSolicitud {
  constructor() {
    super('EN_PROCESO', 'En proceso');
  }

  transiciones() {
    return [
      new Transicion('RESUELTA', [RESPONSABLE], {
        etiqueta: 'Resolver',
        campo: 'solucion',
        etiquetaCampo: 'Solución aplicada',
      }),
    ];
  }

  permiteReasignar() {
    return true;
  }

  permiteObservacion() {
    return true;
  }
}

class Resuelta extends EstadoSolicitud {
  constructor() {
    super('RESUELTA', 'Resuelta');
  }

  transiciones() {
    return [
      new Transicion('CERRADA', [ADMIN, RESPONSABLE], {
        etiqueta: 'Cerrar solicitud',
        campo: 'observacion',
        etiquetaCampo: 'Observación de cierre',
      }),
    ];
  }
}

class Cerrada extends EstadoSolicitud {
  constructor() {
    super('CERRADA', 'Cerrada');
  }

  transiciones() {
    return [
      new Transicion('REABIERTA', [ADMIN], {
        etiqueta: 'Reabrir',
        campo: 'motivo',
        etiquetaCampo: 'Motivo de la reapertura',
      }),
    ];
  }
}

class Reabierta extends EstadoSolicitud {
  constructor() {
    super('REABIERTA', 'Reabierta');
  }

  transiciones() {
    return [
      new Transicion('EN_PROCESO', [RESPONSABLE], {
        etiqueta: 'Retomar atención',
        porDefecto: 'Atención retomada tras la reapertura.',
      }),
    ];
  }

  permiteReasignar() {
    return true;
  }
}

class Rechazada extends EstadoSolicitud {
  constructor() {
    super('RECHAZADA', 'Rechazada');
  }
}

const ESTADOS = [
  new Registrada(),
  new Asignada(),
  new EnProceso(),
  new Resuelta(),
  new Cerrada(),
  new Rechazada(),
  new Reabierta(),
];
const POR_NOMBRE = new Map(ESTADOS.map((e) => [e.nombre, e]));

function obtenerEstado(nombre) {
  const estado = POR_NOMBRE.get(nombre);
  if (!estado) throw new Error(`Estado desconocido: ${nombre}`);
  return estado;
}

module.exports = { ESTADOS, obtenerEstado, EstadoSolicitud, Transicion };
