'use strict';

const { obtenerEstado } = require('../domain/estados');
const guia = require('../content/guia');

const ZONA = 'America/Bogota';
const formatoFechaHora = new Intl.DateTimeFormat('es-CO', {
  timeZone: ZONA,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});
const formatoFecha = new Intl.DateTimeFormat('es-CO', {
  timeZone: ZONA,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const PRIORIDADES = { BAJA: 'Baja', MEDIA: 'Media', ALTA: 'Alta' };
const ROLES = {
  ADMINISTRADOR: 'Administrador',
  ESTUDIANTE: 'Estudiante',
  FUNCIONARIO: 'Funcionario',
  SUPERVISOR: 'Supervisor',
};


const ICONOS = {
  doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  banco: '<path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/>',
  headset: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/><path d="M19 20c0 1-2 2-5 2"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.3c2 .7 3.5 2.5 3.5 5.7"/>',
  tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="8" cy="8" r="1.5"/>',
  chart: '<path d="M4 20V11M10 20V4M16 20v-6M22 20H2"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  flecha: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  buscar: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  salir: '<path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9"/>',
  ayuda: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17v.5"/>',
  subir: '<path d="M6 15l6-6 6 6"/>',
  volumen: '<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11"/>',
  silencio: '<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M17 9.5l4 5M21 9.5l-4 5"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  bandeja: '<path d="M3 13l3-8h12l3 8v6H3z"/><path d="M3 13h5l1 3h6l1-3h5"/>',
  descargar: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
};

/** Icono SVG en línea (trazo, 24x24). Se imprime con <%- icono('doc') %>. */
const icono = (nombre, clase = 'icono') =>
  `<svg class="${clase}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONOS[nombre] || ''}</svg>`;

/** Funciones disponibles dentro de todas las vistas EJS. */
module.exports = {
  fechaHora: (d) => (d ? formatoFechaHora.format(new Date(d)).replace(/ de /g, ' ') : ''),
  fecha: (d) => (d ? formatoFecha.format(new Date(d)).replace(/ de /g, ' ') : ''),
  claseEstado: (nombre) => `estado-${String(nombre).toLowerCase().replace(/_/g, '-')}`,
  clasePrioridad: (p) => `prioridad-${String(p).toLowerCase()}`,
  etiquetaEstado: (nombre) => obtenerEstado(nombre).etiqueta,
  etiquetaPrioridad: (p) => PRIORIDADES[p] || p,
  etiquetaRol: (r) => ROLES[r] || r,
  iniciales: (nombre) =>
    String(nombre || '?')
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase(),
  ayudaPagina: guia.ayudaPagina,
  ayudaEstado: guia.ayudaEstado,
  pasosTour: guia.pasosTour,
  icono,
  PRIORIDADES,
  ROLES,
};
