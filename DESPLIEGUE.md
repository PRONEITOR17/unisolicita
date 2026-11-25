# Cómo publicar UniSolicita para que funcione de verdad

Esta guía deja el sistema en internet, con **usuarios reales, correos reales y base de datos permanente**, sin cuentas de demostración. Cuesta $0 con los planes gratuitos (con las limitaciones que se explican al final).

**Qué vas a usar**

| Pieza | Servicio sugerido | Para qué |
|---|---|---|
| Código | GitHub | Guardar el proyecto y conectarlo con el hosting |
| Servidor web | Render (Web Service) | Ejecutar `npm start` y darte una dirección https |
| Base de datos | Neon (PostgreSQL) | Guardar usuarios y solicitudes de forma permanente |
| Correos | Gmail (o el correo de la universidad) | Enviar los avisos por SMTP |

> **Por qué una base aparte:** el disco de un servicio gratuito de Render es temporal (se borra al reiniciar, redesplegar o dormirse). La base embebida (PGlite) solo sirve en tu computador. En internet se usa PostgreSQL real.

Tiempo estimado: 30–40 minutos la primera vez.

---

## 1. Subir el código a GitHub

En PowerShell, dentro de la carpeta del proyecto:

```powershell
git init
git add .
git commit -m "UniSolicita"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/unisolicita.git
git push -u origin main
```

Antes crea el repositorio vacío en GitHub (botón **New**), preferiblemente **privado**. Verifica que `.env` y `data` **no** se hayan subido (están en `.gitignore`).

## 2. Crear la base de datos en Neon

1. Entra a <https://neon.tech> y crea una cuenta.
2. Crea un proyecto (nombre `unisolicita`, región cercana a ti).
3. En el panel, copia la **cadena de conexión** (*Connection string*). Se ve así:
   `postgresql://usuario:clave@ep-algo.neon.tech/neondb?sslmode=require`
4. Guárdala: la pondrás como `DATABASE_URL` en el paso 4.

No hace falta crear tablas: al arrancar por primera vez, UniSolicita crea el esquema, los roles y las categorías solo.

*(Alternativa: Supabase. Usa la cadena del **Session pooler** —funciona por IPv4, que es lo que Render necesita— y no le agregues `sslmode`.)*

## 3. Preparar el correo (SMTP)

**Con Gmail** (lo más simple para empezar):

1. Usa una cuenta Gmail **dedicada** al sistema (por ejemplo `unisolicita.cul@gmail.com`), no tu cuenta personal.
2. Activa la **verificación en dos pasos** en <https://myaccount.google.com/security>.
3. Entra a <https://myaccount.google.com/apppasswords>, crea una contraseña de aplicación y copia las 16 letras. Esa clave es **solo para este sistema**; tu contraseña normal de Gmail no sirve para SMTP.
4. Datos que usarás: servidor `smtp.gmail.com`, puerto `465` con `SMTP_SECURE=true` (o `587` con `SMTP_SECURE=false`), usuario = el correo completo.

Gmail personal permite unos 500 correos al día, de sobra para empezar. Si la universidad te da un servidor SMTP institucional, úsalo: solo cambian los valores `SMTP_*`.

> No pegues la clave de aplicación en chats ni en el código. Va únicamente en las variables de entorno de Render (paso 4) o en tu `.env` local.

## 4. Publicar en Render

1. Entra a <https://render.com> y crea una cuenta (puedes usar GitHub).
2. **New + → Web Service** → conecta tu repositorio `unisolicita`.
3. Configura:
   - **Language / Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. En **Environment Variables** agrega estas (la lista completa y comentada está en `.env.example`):

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | la cadena de Neon del paso 2 |
| `PGSSL` | `true` |
| `JWT_SECRET` | una cadena larga y aleatoria (ver abajo) |
| `COOKIE_SECURE` | `true` |
| `SHOW_DEMO` | `false` |
| `APP_URL` | `https://TU-SERVICIO.onrender.com` (la dirección que Render te asigne; puedes ajustarla después) |
| `ADMIN_NOMBRE` | nombre real de quien administrará |
| `ADMIN_CORREO` | su correo real |
| `ADMIN_CLAVE` | una clave inicial segura (mínimo 8 caracteres, con letras y números) |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `465` |
| `SMTP_SECURE` | `true` |
| `SMTP_USER` | el correo de Gmail del sistema |
| `SMTP_PASS` | la contraseña de aplicación de 16 letras |
| `SMTP_FROM` | `UniSolicita <el-correo-de-gmail>` |
| `SOPORTE_CORREO` | el correo al que escribirán los usuarios con dudas |

Para generar el `JWT_SECRET` en PowerShell:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

5. Pulsa **Create Web Service**. Render instala y arranca (2–4 minutos). En **Logs** debes ver:
   - `Administrador inicial creado: tu@correo`
   - `UniSolicita en http://localhost:… · base de datos: PostgreSQL`

Si el `APP_URL` quedó distinto de la dirección final, corrígelo en *Environment* y Render reinicia solo: es la dirección que aparece en los botones de los correos.

## 5. Primer uso real

1. Abre tu dirección `https://….onrender.com` e inicia sesión con `ADMIN_CORREO` y `ADMIN_CLAVE`. El recorrido guiado te explica el panel.
2. Entra a tu avatar → **Mi cuenta** y **cambia la clave inicial**. Después puedes borrar `ADMIN_CLAVE` de las variables de Render.
3. Ve a **Usuarios → Nuevo usuario** y crea a las personas reales con su **correo verdadero** y su rol (funcionarios, supervisor, estudiantes). Entrégales su clave inicial por un canal privado; cada persona la cambia en **Mi cuenta**.
4. Ve a **Categorías** y deja solo las que usará tu universidad.
5. **Prueba los correos:** inicia sesión como un estudiante de prueba con un correo tuyo, registra una solicitud y verifica que llegan el aviso (al administrador) y la confirmación (al estudiante). Si no llegan, mira la sección de problemas comunes.
6. Comparte la dirección. Cada rol tiene su guía en el menú **Ayuda**.

## 6. Cosas que debes saber

- **Se duerme:** el plan gratuito de Render pausa el servicio tras 15 minutos sin visitas y la primera visita siguiente tarda hasta ~1 minuto en despertar. Los datos no se pierden (están en Neon). Para un uso diario real, el plan de pago más barato de Render elimina esa pausa.
- **Sesiones:** al reiniciarse el servidor las personas siguen con sesión abierta (la sesión viaja en una cookie firmada con `JWT_SECRET`). Si cambias `JWT_SECRET`, todos deberán volver a entrar.
- **Copias de seguridad:** revisa en Neon las opciones de restauración de tu plan. Para el informe del proyecto basta con saber que los datos viven en PostgreSQL y no en el servidor web.
- **Actualizar el sistema:** haz cambios, `git add .`, `git commit`, `git push`; Render vuelve a publicar solo.
- **Más usuarios por rol:** solo el administrador crea cuentas (no hay registro abierto). Es intencional: en una universidad real las cuentas las entrega la institución.
- **Dominio propio:** en Render, *Settings → Custom Domains*. Luego actualiza `APP_URL`.

## 7. Problemas comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| El servicio no inicia: *Define JWT_SECRET…* | Falta `JWT_SECRET` | Agrégala en Environment |
| *no pg_hba.conf entry* o error SSL | Falta `PGSSL=true` | Ponla en `true` |
| *ENETUNREACH* / no conecta (Supabase) | Usaste la conexión directa (IPv6) | Usa la del **Session pooler** |
| Entro y me devuelve al login | `COOKIE_SECURE=true` pero abres la página con `http://` | Usa la dirección `https://` |
| *Bloqueado por intentos fallidos* | 5 intentos erróneos seguidos | Espera 15 minutos |
| No llegan correos y en Logs aparece *No se pudo enviar el correo* | Clave de aplicación incorrecta, puerto/seguro mal combinados o verificación en dos pasos apagada | Revisa `SMTP_*`: puerto 465 con `SMTP_SECURE=true`, o 587 con `false` |
| No llegan correos y no hay errores | `SMTP_HOST` vacío (correo apagado) o el mensaje cayó en spam | Define `SMTP_HOST`; revisa spam y marca como no deseado → seguro |
| No existe ningún administrador | Se arrancó sin `ADMIN_CORREO` y `ADMIN_CLAVE` | Defínelos y reinicia el servicio |

## 8. Usarlo de forma real en tu computador (sin internet)

Si solo quieres probarlo con usuarios reales en tu casa o en la universidad, dentro de la red:

```powershell
# 1. Borra los datos de demostración (con el servidor detenido)
Remove-Item -Recurse -Force data

# 2. Crea tu .env a partir del ejemplo
Copy-Item .env.example .env
#    Ábrelo y pon: SHOW_DEMO=false, ADMIN_NOMBRE, ADMIN_CORREO, ADMIN_CLAVE y, si quieres correos, SMTP_*

# 3. Arranca
npm start
```

También puedes crear administradores adicionales desde la terminal (con el servidor detenido si usas la base embebida):

```powershell
npm run crear-admin -- --correo rectoria@universidad.edu --nombre "Ana Pérez" --clave Clave1234
```

## 9. Lista de comprobación antes de abrirlo al público

- [ ] `SHOW_DEMO=false` y no existe ninguna cuenta `@unisolicita.edu` de demostración
- [ ] `JWT_SECRET` largo y aleatorio, distinto al del ejemplo
- [ ] `COOKIE_SECURE=true` y el sitio abre con `https://`
- [ ] Clave inicial del administrador cambiada en **Mi cuenta**
- [ ] `.env` no está en GitHub
- [ ] Correo de prueba recibido (registro, asignación, cambio de estado)
- [ ] Cada rol entra y ve su propia guía en **Ayuda**
