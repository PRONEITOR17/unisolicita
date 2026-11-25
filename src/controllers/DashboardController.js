'use strict';

const ORDEN_ESTADOS = ['REGISTRADA', 'ASIGNADA', 'EN_PROCESO', 'RESUELTA', 'CERRADA', 'REABIERTA', 'RECHAZADA'];

class DashboardController {
  constructor(c) {
    this.c = c;
  }

  panel = async (req, res) => {
    const { usuario } = req;
    const [conteo, recientes, pendientes] = await Promise.all([
      this.c.solicitudes.resumen(usuario),
      this.c.solicitudes.listar(usuario, {}).then((l) => l.slice(0, 5)),
      usuario.rol === 'ADMINISTRADOR'
        ? this.c.solicitudes.listar(usuario, { responsable: 'sin', estado: 'REGISTRADA' })
        : Promise.resolve([]),
    ]);
    const total = Object.values(conteo).reduce((a, b) => a + b, 0);
    const abiertas = ['REGISTRADA', 'ASIGNADA', 'EN_PROCESO', 'REABIERTA'].reduce(
      (a, e) => a + (conteo[e] || 0),
      0,
    );
    res.render('dashboard', {
      titulo: 'Panel',
      ruta: '/panel',
      conteo,
      total,
      abiertas,
      ordenEstados: ORDEN_ESTADOS,
      recientes,
      sinAsignar: pendientes.length,
    });
  };
}

module.exports = { DashboardController };
