/* UniSolicita · guía interactiva (sin estilos ni scripts en línea: CSP)
   1) Recorrido guiado del panel, la primera vez que entra cada persona o con /panel?guia=1
   2) Ayuda de cada pantalla: se abre sola la primera vez y luego queda cerrada */
(function () {
  var datos = document.getElementById('guia-datos');
  if (!datos) return;
  var clave = datos.getAttribute('data-clave') || 'unisolicita-guia';

  function leer(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function guardar(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } }

  /* ---------- Ayuda de cada pantalla ---------- */
  document.querySelectorAll('details.ayuda-pagina').forEach(function (d) {
    var k = clave + '-pantalla-' + d.getAttribute('data-ayuda');
    if (!leer(k)) d.open = true;
    d.addEventListener('toggle', function () { if (!d.open) guardar(k, '1'); });
  });

  /* ---------- Recorrido guiado ---------- */
  var enPanel = window.location.pathname === '/panel';
  if (!enPanel) return;
  var pasos;
  try { pasos = JSON.parse(datos.getAttribute('data-pasos') || '[]'); } catch (e) { pasos = []; }
  var forzado = /[?&]guia=1/.test(window.location.search);
  if (!pasos.length || (!forzado && leer(clave) === '1')) return;

  function visible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  // Solo los pasos cuyo elemento existe en pantalla (en el celular el menú puede estar oculto)
  var lista = pasos.filter(function (p) { return !p.selector || visible(document.querySelector(p.selector)); });
  if (!lista.length) return;

  var i = 0;
  var fondo = document.createElement('div');
  fondo.className = 'guia-fondo';
  var foco = document.createElement('div');
  foco.className = 'guia-foco';
  var tarjeta = document.createElement('div');
  tarjeta.className = 'guia-tarjeta';
  tarjeta.setAttribute('role', 'dialog');
  tarjeta.setAttribute('aria-modal', 'true');
  tarjeta.setAttribute('aria-labelledby', 'guia-titulo');

  var contador = document.createElement('small');
  contador.className = 'guia-contador';
  var titulo = document.createElement('h3');
  titulo.id = 'guia-titulo';
  var texto = document.createElement('p');
  var pie = document.createElement('div');
  pie.className = 'guia-pie';
  var omitir = boton('Omitir', 'btn btn-borde btn-sm');
  var atras = boton('Anterior', 'btn btn-borde btn-sm');
  var sigue = boton('Siguiente', 'btn btn-oro btn-sm');
  var grupo = document.createElement('div');
  grupo.className = 'guia-botones';
  grupo.appendChild(atras);
  grupo.appendChild(sigue);
  pie.appendChild(omitir);
  pie.appendChild(grupo);
  tarjeta.appendChild(contador);
  tarjeta.appendChild(titulo);
  tarjeta.appendChild(texto);
  tarjeta.appendChild(pie);
  document.body.appendChild(fondo);
  document.body.appendChild(foco);
  document.body.appendChild(tarjeta);

  function boton(t, clase) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = clase;
    b.textContent = t;
    return b;
  }

  function cerrar() {
    guardar(clave, '1');
    document.removeEventListener('keydown', teclas);
    window.removeEventListener('resize', colocar);
    window.removeEventListener('scroll', colocar);
    [fondo, foco, tarjeta].forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
    if (forzado && window.history.replaceState) window.history.replaceState(null, '', '/panel');
  }

  function colocar() {
    var paso = lista[i];
    var el = paso.selector ? document.querySelector(paso.selector) : null;
    var margen = 16;
    var ancho = tarjeta.offsetWidth;
    var alto = tarjeta.offsetHeight;
    if (!el) {
      foco.style.display = 'none';
      fondo.classList.add('oscuro');
      tarjeta.style.left = Math.max(margen, (window.innerWidth - ancho) / 2) + 'px';
      tarjeta.style.top = Math.max(margen, (window.innerHeight - alto) / 2) + 'px';
      return;
    }
    fondo.classList.remove('oscuro');
    var r = el.getBoundingClientRect();
    var pad = 6;
    foco.style.display = 'block';
    foco.style.left = r.left - pad + 'px';
    foco.style.top = r.top - pad + 'px';
    foco.style.width = r.width + pad * 2 + 'px';
    foco.style.height = r.height + pad * 2 + 'px';
    var arriba = r.bottom + 14;
    if (arriba + alto > window.innerHeight - margen) arriba = r.top - alto - 14;
    if (arriba < margen) arriba = Math.min(window.innerHeight - alto - margen, r.bottom + 14);
    var izq = r.left + r.width / 2 - ancho / 2;
    izq = Math.max(margen, Math.min(izq, window.innerWidth - ancho - margen));
    tarjeta.style.left = izq + 'px';
    tarjeta.style.top = Math.max(margen, arriba) + 'px';
  }

  function mostrar() {
    var paso = lista[i];
    contador.textContent = 'Paso ' + (i + 1) + ' de ' + lista.length;
    titulo.textContent = paso.titulo;
    texto.textContent = paso.texto;
    atras.style.visibility = i === 0 ? 'hidden' : 'visible';
    sigue.textContent = i === lista.length - 1 ? 'Terminar' : 'Siguiente';
    var el = paso.selector ? document.querySelector(paso.selector) : null;
    if (el) el.scrollIntoView({ block: 'center', behavior: 'auto' });
    colocar();
    sigue.focus({ preventScroll: true });
  }

  function avanzar() { if (i >= lista.length - 1) cerrar(); else { i += 1; mostrar(); } }
  function retroceder() { if (i > 0) { i -= 1; mostrar(); } }
  function teclas(e) {
    if (e.key === 'Escape') cerrar();
    else if (e.key === 'ArrowRight') avanzar();
    else if (e.key === 'ArrowLeft') retroceder();
  }

  sigue.addEventListener('click', avanzar);
  atras.addEventListener('click', retroceder);
  omitir.addEventListener('click', cerrar);
  fondo.addEventListener('click', function () { /* el fondo bloquea clics: se sale con Omitir o Esc */ });
  document.addEventListener('keydown', teclas);
  window.addEventListener('resize', colocar);
  window.addEventListener('scroll', colocar, { passive: true });
  mostrar();
})();
