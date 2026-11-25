'use strict';

const ESCAPE_CSV = /[",\n\r]/;
const csv = (v) => {
  let t = String(v ?? '');
  if (/^[=+\-@]/.test(t)) t = `'${t}`; // evita inyección de fórmulas al abrir en Excel
  return ESCAPE_CSV.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

class ReporteController {
  constructor(c) {
    this.c = c;
  }

  ver = async (req, res) => {
    const [reporte, categorias, funcionarios] = await Promise.all([
      this.c.reportes.generar(req.query),
      this.c.categorias.listar(),
      this.c.usuarios.listar({ rol: 'FUNCIONARIO' }),
    ]);
    res.render('reportes', {
      titulo: 'Reportes',
      ruta: '/reportes',
      reporte,
      categorias,
      funcionarios,
      q: req.query,
      consulta: new URLSearchParams(
        Object.entries(req.query).filter(([, v]) => typeof v === 'string' && v),
      ).toString(),
    });
  };

  exportar = async (req, res) => {
    const { filas } = await this.c.reportes.generar(req.query);
    const encabezado = ['Código', 'Fecha', 'Solicitante', 'Categoría', 'Prioridad', 'Estado', 'Responsable'];
    const lineas = filas.map((s) =>
      [
        s.codigo,
        new Date(s.fechaRegistro).toISOString().slice(0, 10),
        s.solicitante,
        s.categoria,
        s.prioridad,
        s.estado.etiqueta,
        s.responsable || 'Sin asignar',
      ]
        .map(csv)
        .join(','),
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte-solicitudes.csv"');
    res.send(`\uFEFF${[encabezado.join(','), ...lineas].join('\r\n')}\r\n`);
  };
}

module.exports = { ReporteController };
