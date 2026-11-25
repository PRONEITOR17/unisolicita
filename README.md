# UniSolicita

Sistema web de gestión de servicios y solicitudes universitarias. Proyecto final de **Ingeniería del Software**.

Los estudiantes registran solicitudes (certificados, matrícula, apoyo financiero, soporte, etc.); un administrador las asigna a un funcionario; el funcionario las atiende y las resuelve; y cada cambio queda en un historial que no se puede alterar y genera una notificación.

**Stack:** Node.js 20+ · Express · EJS · PostgreSQL · JWT en cookie httpOnly · bcrypt · Nodemailer (correos) · Chart.js · Jest + Supertest · ESLint.

**Listo para usarse de verdad:** correos de notificación por SMTP, guía de uso dentro del sistema para cada rol (recorrido guiado, página de Ayuda y ayuda en cada pantalla), cambio de contraseña, primer administrador real y modo producción sin cuentas de demostración. Para publicarlo, sigue **[DESPLIEGUE.md](DESPLIEGUE.md)**.

---

## 1. Instalación rápida (sin instalar PostgreSQL)

Requisito: [Node.js 20 o superior](https://nodejs.org).

```bash
npm install
npm start
```

Abre <http://localhost:3000>. La primera vez crea solo la base de datos (PostgreSQL embebido, guardado en `./data/pgdata`), las tablas, los roles, las categorías y los usuarios de demostración.

Para cargar 24 solicitudes de ejemplo (con historial y fechas de varias semanas):

```bash
npm run seed:demo
```

## 2. Con PostgreSQL real (local, Supabase, Neon…)

1. Crea una base de datos vacía, por ejemplo `unisolicita`.
2. Copia `.env.example` como `.env` y completa:

   ```env
   DATABASE_URL=postgresql://usuario:clave@localhost:5432/unisolicita
   PGSSL=false          # true si el proveedor exige SSL (Supabase, Neon)
   JWT_SECRET=una-cadena-larga-y-aleatoria
   ```
3. Crea las tablas y los datos iniciales, y arranca:

   ```bash
   npm run db:init
   npm start
   ```

Los scripts también se pueden ejecutar a mano con `psql -f db/schema.sql`, luego `db/seed.sql` (roles y categorías) y, solo si quieres cuentas de ejemplo, `db/seed_demo.sql`.

## 3. Cuentas de demostración

Contraseña de todas: **`Demo1234*`**

| Rol | Correo |
|---|---|
| Administrador | admin@unisolicita.edu |
| Supervisor | supervisor@unisolicita.edu |
| Funcionario | funcionario1@unisolicita.edu · funcionario2@unisolicita.edu |
| Estudiante | estudiante1@unisolicita.edu · estudiante2@unisolicita.edu |

> Las cuentas de demostración solo existen si `SHOW_DEMO=true` (es el valor por defecto en desarrollo). Para usar el sistema de verdad mira la sección 4.

## 4. Uso real: usuarios, correos y administrador

Con `NODE_ENV=production` (o `SHOW_DEMO=false`) el sistema arranca **sin cuentas de ejemplo**. Qué configurar (todo en `.env`, ver `.env.example`):

| Para… | Variables |
|---|---|
| Tener un primer administrador real | `ADMIN_NOMBRE`, `ADMIN_CORREO`, `ADMIN_CLAVE` (se crea al iniciar si todavía no hay ninguno) |
| Enviar correos de aviso | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` y `APP_URL` (para los enlaces) |
| Mostrar el correo de ayuda | `SOPORTE_CORREO` |

Flujo: el administrador entra, cambia su clave en **Mi cuenta**, crea a los demás usuarios con sus correos reales en **Usuarios** y cada persona cambia su clave inicial en **Mi cuenta**. No hay registro abierto: las cuentas las entrega la institución.

**Correos.** Se envían al registrar (aviso a los administradores y confirmación al estudiante), al asignar (responsable y solicitante) y en cada cambio de estado (solicitante; si se reabre, también el responsable). Salen después de confirmar el trámite y, si el servidor de correo falla, el trámite igual se guarda (el error queda en el registro del servidor). Sin `SMTP_HOST` el sistema funciona igual, solo con avisos dentro de la página.

**Crear administradores desde la terminal** (con el servidor detenido si usas la base embebida):

```bash
npm run crear-admin -- --correo rectoria@universidad.edu --nombre "Ana Pérez" --clave Clave1234
```

**Empezar de cero en tu computador:** detén el servidor, borra la carpeta `data` (en PowerShell: `Remove-Item -Recurse -Force data`) y arranca otra vez. `npm run seed:demo` también debe ejecutarse con el servidor detenido.

## 5. Guía de uso dentro del sistema

- **Recorrido guiado:** la primera vez que entra, cada persona ve en el panel una visita paso a paso según su rol. Se repite desde **Ayuda → Repetir el recorrido guiado**.
- **Página Ayuda** (`/ayuda`): qué puede y qué no puede hacer cada rol, tareas paso a paso, tabla de estados y preguntas frecuentes. Cada persona ve la de su rol y puede consultar las de los demás.
- **Ayuda en cada pantalla:** un recuadro «¿Cómo funciona esta pantalla?» (se abre solo la primera vez).
- **Explicación del estado:** el detalle de una solicitud dice, según tu rol, qué significa el estado actual y qué toca hacer.
- **Aviso con sonido:** mientras tengas el sistema abierto, cuando llega una notificación suena un tono corto y aparece un cartel arriba a la derecha. El botón del parlante (abajo a la derecha) lo silencia o lo activa. El navegador solo permite el sonido después del primer clic en la página, y no suena si la pestaña está cerrada.

El contenido está en `src/content/guia.js`: si cambias una regla del sistema, edita ese archivo y la ayuda queda al día.

## 6. Roles y permisos

| Acción | Estudiante | Funcionario | Administrador | Supervisor |
|---|:-:|:-:|:-:|:-:|
| Registrar solicitud | ✔ | | | |
| Ver solicitudes | las suyas | las asignadas | todas | todas |
| Asignar / reasignar responsable | | | ✔ | |
| Iniciar, observar y resolver | | las asignadas | | |
| Cerrar | | las asignadas | ✔ | |
| Rechazar | | las asignadas (estado Asignada) | ✔ | |
| Reabrir una solicitud cerrada | | | ✔ | |
| Gestionar usuarios y categorías | | | ✔ | |
| Reportes y exportación CSV | | | ✔ | ✔ |
| Notificaciones propias | ✔ | ✔ | ✔ | ✔ |

## 7. Ciclo de vida de una solicitud

```
REGISTRADA ──► ASIGNADA ──► EN PROCESO ──► RESUELTA ──► CERRADA ──► REABIERTA ──► EN PROCESO
    │             │
    └─────────────┴──► RECHAZADA (estado final)
```

- Resolver exige una **solución**; rechazar y reabrir exigen un **motivo**; cerrar exige una observación.
- Se puede **reasignar** el responsable en Asignada, En proceso y Reabierta.
- Cada cambio guarda quién, cuándo, de qué estado a cuál y con qué texto. Una restricción en la base de datos (trigger) impide modificar o borrar ese historial.

## 8. Arquitectura

Arquitectura en capas (MVC con servicios y repositorios) y tres patrones de diseño:

| Patrón | Dónde |
|---|---|
| **State** | `src/domain/estados.js` — una clase por estado; cada una dice a qué estados puede pasar, quién puede y qué texto exige |
| **Observer** | `src/domain/eventos.js` — `EventBus` + notificador que genera los avisos (y los correos) al registrar, asignar y cambiar de estado |
| **Repository** | `src/repositories/index.js` — todo el SQL vive aquí, parametrizado |

```
src/
├── server.js            arranque (conexión, esquema, listen)
├── app.js               Express: middleware, rutas, vistas
├── container.js         inyección de dependencias (servicios + bus de eventos)
├── config.js · errors.js
├── domain/              modelos, patrón State, patrón Observer
├── services/            reglas de negocio (Auth, Solicitud, Usuario, Categoría, Notificación, Reporte, Correo)
├── content/guia.js      textos de la guía de uso por rol, estado y pantalla
├── repositories/        acceso a datos
├── controllers/         reciben la petición y eligen la vista
├── routes/              tabla de rutas y roles permitidos
├── middleware/          autenticación, CSRF, cabeceras, errores, mensajes flash
├── views/               plantillas EJS
└── db/                  conexión (PostgreSQL / PGlite), migración, primer administrador, datos de demostración
db/schema.sql · db/seed.sql (roles y categorías) · db/seed_demo.sql (cuentas de ejemplo)
public/                  CSS, JS del navegador, logo
tests/                   pruebas unitarias y de integración
scripts/metricas.js      métricas de código para el informe
```

## 9. Pruebas y calidad

```bash
npm test          # 103 pruebas + cobertura
npm run lint      # ESLint (incluye complejidad ciclomática)
npm run metricas  # archivos, líneas y clases por capa
```

Las pruebas usan PostgreSQL embebido en memoria. Para correrlas contra un PostgreSQL real (¡recrea el esquema `public` de esa base!):

```bash
TEST_DATABASE_URL=postgresql://usuario:clave@localhost:5432/unisolicita_test npm test
```

En Windows (PowerShell): `$env:TEST_DATABASE_URL="..."; npm test`.

Cubren: ciclo de vida completo, transiciones inválidas, reglas de negocio, permisos por rol, historial inmutable, CSRF, bloqueo por intentos fallidos, usuarios y categorías, reportes y rendimiento con 1000 solicitudes, correos de notificación (incluido el fallo del servidor SMTP), cambio de contraseña, primer administrador sin cuentas de demostración, contenido de la guía por rol y avisos en vivo.

## 10. Seguridad

Contraseñas con bcrypt (y cambio de clave con verificación de la actual) · sesión con JWT en cookie `httpOnly` + `SameSite=Lax` · protección CSRF en todos los formularios · bloqueo temporal tras 5 intentos fallidos · mismo mensaje ante correo inexistente o clave errónea · consultas SQL parametrizadas · salida HTML escapada · cabeceras CSP, `X-Frame-Options` y `nosniff` · usuarios y categorías se desactivan, nunca se borran.

## 11. Subirlo a GitHub

```bash
git init
git add .
git commit -m "UniSolicita: versión inicial"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/unisolicita.git
git push -u origin main
```

`node_modules`, `data` y `.env` ya están en `.gitignore`.

## 12. Desplegar

Guía completa, paso a paso (GitHub + Render + Neon + correo SMTP, variables, primer uso y problemas comunes): **[DESPLIEGUE.md](DESPLIEGUE.md)**. Resumen: `NODE_ENV=production`, `DATABASE_URL`, `PGSSL=true`, `JWT_SECRET`, `COOKIE_SECURE=true`, `APP_URL`, `ADMIN_*` y `SMTP_*`; comando de inicio `npm start`. En un servicio con disco temporal (Render gratuito) usa siempre PostgreSQL real, no la base embebida.

## 13. Diseño

La interfaz sigue la identidad visual de la CUL (azul institucional, dorado, naranja del escudo, tarjetas redondeadas y la tipografía Open Sans, incluida en `public/fonts`). El escudo (`public/img/cul-escudo.jpg`) y la foto del campus (`public/img/cul-campus.jpg`) son material de la Corporación Universitaria Latinoamericana entregado por el autor del proyecto; si hay una versión oficial de mayor resolución, basta con reemplazar esos archivos con el mismo nombre. El favicon (`favicon.png`, `apple-touch-icon.png`) se generó a partir del escudo.
