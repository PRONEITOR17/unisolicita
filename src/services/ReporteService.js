'use strict';
const { crearRepos } = require('../repositories');
const { obtenerEstado } = require('../domain/estados');
const validar = require('./validar');

const ETIQUETA_PRIORIDAD = { BAJA: 'Baja', MEDIA: 'Media', ALTA: 'Alta' };

class ReporteService {
  constructor({ db }) {
    this.db = db;
  }

  /** RF11: totales por estado, categoría, prioridad y responsable en un periodo. */
  async generar(entrada) {
    const filtros = validar.filtros(entrada);
    const repos = crearRepos(this.db);
    const r = repos.reportes;
    const [total, horas, porEstado, porCategoria, porPrioridad, porResponsable, filas] =
      await Promise.all([
        r.total(filtros),
        r.horasPromedioResolucion(filtros),
        r.agrupar('s.estado', '', filtros),
        r.agrupar('c.nombre', 'JOIN categoria c ON c.id_categoria = s.id_categoria', filtros),
        r.agrupar('s.prioridad', '', filtros),
        r.agrupar(
          "COALESCE(u.nombre, 'Sin asignar')",
          'LEFT JOIN usuario u ON u.id_usuario = s.id_responsable',
          filtros,
        ),
        repos.solicitudes.listar(filtros, 100),
      ]);
    return {
      filtros,
      total,
      horasPromedioResolucion: horas,
      porEstado: porEstado.map((f) => ({ ...f, etiqueta: obtenerEstado(f.clave).etiqueta })),
      porCategoria: porCategoria.map((f) => ({ ...f, etiqueta: f.clave })),
      porPrioridad: porPrioridad.map((f) => ({ ...f, etiqueta: ETIQUETA_PRIORIDAD[f.clave] })),
      porResponsable: porResponsable.map((f) => ({ ...f, etiqueta: f.clave })),
      filas,
    };
  }
}

module.exports = { ReporteService };
