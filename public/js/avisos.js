/* UniSolicita · avisos en vivo: sonido, cartel emergente y contador que se actualizan solos.
   Sin estilos ni scripts en línea (CSP). Consulta /notificaciones/novedades cada pocos segundos. */
(function () {
  var boton = document.getElementById('avisos-sonido');
  if (!boton || !window.fetch) return;

  var INTERVALO = 15000;
  var MAX_CARTELES = 3;
  var clave = boton.getAttribute('data-clave');
  var desde = null; // último aviso conocido; la primera consulta solo fija el punto de partida (sin sonido)
  var contexto = null;
  var detenido = false;

  function leer(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function guardar(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } }

  /* ---------- Sonido (generado con Web Audio: no hay archivos de audio) ---------- */
  var sonidoActivo = leer(clave) !== 'off';
  function pintarBoton() {
    boton.setAttribute('aria-pressed', sonidoActivo ? 'true' : 'false');
    boton.setAttribute('title', sonidoActivo ? 'Sonido activado: pulsa para silenciar' : 'Sonido silenciado: pulsa para activar');
  }
  pintarBoton();

  // Los navegadores solo permiten sonar después de que la persona toca la página una vez.
  function prepararAudio() {
    var Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    if (!contexto) contexto = new Audio();
    if (contexto.state === 'suspended') contexto.resume();
  }
  ['pointerdown', 'keydown'].forEach(function (evento) {
    document.addEventListener(evento, prepararAudio, { passive: true });
  });

  function nota(frecuencia, inicio, duracion) {
    var osc = contexto.createOscillator();
    var volumen = contexto.createGain();
    osc.type = 'sine';
    osc.frequency.value = frecuencia;
    volumen.gain.setValueAtTime(0.0001, inicio);
    volumen.gain.exponentialRampToValueAtTime(0.28, inicio + 0.02);
    volumen.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);
    osc.connect(volumen);
    volumen.connect(contexto.destination);
    osc.start(inicio);
    osc.stop(inicio + duracion + 0.05);
  }

  function sonar() {
    if (navigator.vibrate) navigator.vibrate(120);
    if (!sonidoActivo || !contexto || contexto.state !== 'running') return;
    var t = contexto.currentTime;
    nota(880, t, 0.28);
    nota(1318.5, t + 0.16, 0.45);
  }

  boton.addEventListener('click', function () {
    sonidoActivo = !sonidoActivo;
    guardar(clave, sonidoActivo ? 'on' : 'off');
    pintarBoton();
    prepararAudio();
    if (sonidoActivo && contexto && contexto.state === 'running') {
      var t = contexto.currentTime;
      nota(880, t, 0.28); // vista previa del sonido
      nota(1318.5, t + 0.16, 0.45);
    }
  });

  /* ---------- Contador (menú, campana flotante y título de la pestaña) ---------- */
  function pintarContador(total) {
    document.querySelectorAll('.menu a[href="/notificaciones"], .fab-naranja').forEach(function (contenedor) {
      var insignia = contenedor.querySelector('.insignia');
      if (total > 0 && !insignia) {
        insignia = document.createElement('span');
        insignia.className = 'insignia';
        if (contenedor.classList.contains('menu') || contenedor.closest('.menu')) contenedor.appendChild(document.createTextNode(' '));
        contenedor.appendChild(insignia);
      }
      if (insignia) {
        if (total > 0) insignia.textContent = String(total);
        else insignia.parentNode.removeChild(insignia);
      }
    });
    document.title = document.title.replace(/^\(\d+\) /, '');
    if (total > 0) document.title = '(' + total + ') ' + document.title;
  }

  /* ---------- Cartel emergente ---------- */
  var pila = document.createElement('div');
  pila.className = 'avisos-pila';
  pila.setAttribute('role', 'status');
  pila.setAttribute('aria-live', 'polite');
  document.body.appendChild(pila);

  function cerrarCartel(cartel) {
    if (cartel.parentNode) cartel.parentNode.removeChild(cartel);
  }

  function cartel(titulo, texto, enlace, etiquetaEnlace) {
    var el = document.createElement('div');
    el.className = 'aviso-cartel';
    var cuerpo = document.createElement('div');
    var t = document.createElement('strong');
    t.textContent = titulo;
    var p = document.createElement('p');
    p.textContent = texto;
    var a = document.createElement('a');
    a.href = enlace;
    a.textContent = etiquetaEnlace;
    var x = document.createElement('button');
    x.type = 'button';
    x.className = 'aviso-cerrar';
    x.setAttribute('aria-label', 'Cerrar aviso');
    x.textContent = '×';
    x.addEventListener('click', function () { cerrarCartel(el); });
    cuerpo.appendChild(t);
    cuerpo.appendChild(p);
    cuerpo.appendChild(a);
    el.appendChild(cuerpo);
    el.appendChild(x);
    pila.appendChild(el);
    while (pila.children.length > MAX_CARTELES) cerrarCartel(pila.firstChild);
    window.setTimeout(function () { cerrarCartel(el); }, 12000);
  }

  function mostrar(nuevas, sinLeer) {
    var enLista = window.location.pathname === '/notificaciones';
    if (nuevas.length === 1) {
      var n = nuevas[0];
      cartel('Nueva notificación · ' + n.codigo, n.mensaje, enLista ? '/notificaciones' : '/solicitudes/' + n.solicitud, enLista ? 'Actualizar la lista' : 'Abrir solicitud');
    } else {
      cartel('Tienes ' + nuevas.length + ' avisos nuevos', 'Se actualizaron tus solicitudes. Tienes ' + sinLeer + ' sin leer.', '/notificaciones', enLista ? 'Actualizar la lista' : 'Ver avisos');
    }
    sonar();
  }

  /* ---------- Consulta periódica ---------- */
  function consultar() {
    if (detenido) return;
    var url = '/notificaciones/novedades' + (desde === null ? '' : '?desde=' + desde);
    window.fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (r) {
        var json = r.ok && (r.headers.get('content-type') || '').indexOf('application/json') > -1;
        if (!json) { detenido = true; return null; } // la sesión terminó: se deja de consultar
        return r.json();
      })
      .then(function (datos) {
        if (!datos) return;
        var primera = desde === null;
        desde = datos.ultimoId;
        pintarContador(datos.sinLeer);
        if (!primera && datos.nuevas.length) mostrar(datos.nuevas, datos.sinLeer);
      })
      .catch(function () { /* sin red: se reintenta en el próximo ciclo */ });
  }

  consultar();
  window.setInterval(consultar, INTERVALO);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) consultar(); });
})();
