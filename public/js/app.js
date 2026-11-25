/* UniSolicita · comportamiento mínimo del navegador (sin estilos ni scripts en línea: CSP) */
(function () {
  // Color de acento de los contadores y anchos de las barras (datos en atributos data-*)
  document.querySelectorAll('[data-color]').forEach(function (el) {
    el.style.setProperty('--c', el.getAttribute('data-color'));
  });
  document.querySelectorAll('[data-ancho]').forEach(function (el) {
    el.style.width = el.getAttribute('data-ancho') + '%';
  });

  // Confirmación antes de acciones delicadas
  document.querySelectorAll('form[data-confirmar]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      if (!window.confirm(form.getAttribute('data-confirmar'))) e.preventDefault();
    });
  });

  // Evita doble envío de formularios
  document.querySelectorAll('form').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      if (e.defaultPrevented) return;
      var boton = e.submitter || form.querySelector('button[type="submit"]');
      if (boton) setTimeout(function () { boton.disabled = true; }, 0);
    });
  });

  // Cuentas de demostración: rellenan el formulario de acceso
  document.querySelectorAll('[data-demo]').forEach(function (b) {
    b.addEventListener('click', function () {
      document.getElementById('correo').value = b.getAttribute('data-demo');
      document.getElementById('contrasena').value = 'Demo1234*';
      document.getElementById('form-login').submit();
    });
  });

  // Botón "volver arriba"
  var subir = document.querySelector('.subir');
  if (subir) {
    window.addEventListener('scroll', function () {
      subir.classList.toggle('visible', window.scrollY > 500);
    });
    subir.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }
})();
