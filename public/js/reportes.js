/* Gráficas del módulo de reportes (Chart.js servido desde node_modules, sin CDN) */
(function () {
  var nodo = document.getElementById('datos-reporte');
  if (!nodo || typeof Chart === 'undefined') return;
  var datos = JSON.parse(nodo.textContent);
  var COLOR_ESTADO = { REGISTRADA: '#6b7a99', ASIGNADA: '#1da1d8', EN_PROCESO: '#f6b61c', RESUELTA: '#17b862', CERRADA: '#0b2a63', REABIERTA: '#f26b21', RECHAZADA: '#d6403a' };
  var COLOR_PRIORIDAD = { ALTA: '#d6403a', MEDIA: '#f6b61c', BAJA: '#6b7a99' };
  var PALETA = ['#1250d0', '#f6b61c', '#17b862', '#f26b21', '#1da1d8', '#0b2a63', '#8a63d2', '#d6403a'];
  var opciones = { responsive: true, maintainAspectRatio: false };

  function dona(id, lista, colores) {
    var lienzo = document.getElementById(id);
    if (!lienzo || !lista.length) return;
    new Chart(lienzo, {
      type: 'doughnut',
      data: { labels: lista.map(function (f) { return f.etiqueta; }), datasets: [{ data: lista.map(function (f) { return f.total; }), backgroundColor: colores, borderWidth: 2 }] },
      options: Object.assign({}, opciones, { plugins: { legend: { position: 'bottom' } } }),
    });
  }

  dona('g-estado', datos.estado, datos.estado.map(function (f) { return COLOR_ESTADO[f.clave]; }));
  dona('g-prioridad', datos.prioridad, datos.prioridad.map(function (f) { return COLOR_PRIORIDAD[f.clave]; }));

  var barras = document.getElementById('g-categoria');
  if (barras && datos.categoria.length) {
    new Chart(barras, {
      type: 'bar',
      data: { labels: datos.categoria.map(function (f) { return f.etiqueta; }), datasets: [{ data: datos.categoria.map(function (f) { return f.total; }), backgroundColor: datos.categoria.map(function (f, i) { return PALETA[i % PALETA.length]; }), borderRadius: 8 }] },
      options: Object.assign({}, opciones, { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } }),
    });
  }
})();
