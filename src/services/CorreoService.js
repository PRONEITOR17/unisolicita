'use strict';
const nodemailer = require('nodemailer');

const escapar = (texto) =>
  String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Versión HTML sencilla del aviso (los estilos van en línea porque así lo exigen los clientes de correo). */
function plantilla({ saludo, texto, enlace, textoEnlace, logo }) {
  const escudo = logo ? `<img src="${escapar(logo)}" width="40" height="40" alt="CUL" style="vertical-align:middle;border-radius:10px;margin-right:12px">` : '';
  const boton = enlace
    ? `<p style="margin:24px 0 0"><a href="${escapar(enlace)}" style="background:#f6b61c;color:#0b2a63;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px;display:inline-block">${escapar(textoEnlace)}</a></p>`
    : '';
  return `<!DOCTYPE html><html lang="es"><body style="margin:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;color:#1c2a4a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:#0b2a63;color:#fff;padding:16px 28px;font-size:20px;font-weight:700">${escudo}<span style="vertical-align:middle">Uni<span style="color:#f6b61c">Solicita</span></span></td></tr>
<tr><td style="padding:28px">
<p style="margin:0 0 12px;font-size:16px;font-weight:700">${escapar(saludo)}</p>
<p style="margin:0;font-size:15px;line-height:1.5">${escapar(texto)}</p>${boton}
</td></tr>
<tr><td style="padding:16px 28px;background:#f4f6fb;font-size:12px;color:#6b7a99">Recibes este correo porque tienes una cuenta en UniSolicita. Por favor no respondas a este mensaje.</td></tr>
</table></td></tr></table></body></html>`;
}

/**
 * Envío de correos de notificación (SMTP con nodemailer).
 * Si no hay SMTP configurado queda deshabilitado y el sistema sigue funcionando solo con avisos internos.
 * enviar() nunca lanza: un correo que falla no debe romper el trámite del usuario.
 */
function crearTransporte(smtp) {
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: Boolean(smtp.secure),
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
  });
}

/** El escudo solo se incluye si el sistema está publicado en https (en local el correo no podría cargarlo). */
const urlEscudo = (appUrl) => (String(appUrl).startsWith('https://') ? `${appUrl}/img/cul-escudo.jpg` : '');

class CorreoService {
  constructor({ smtp = {}, appUrl = '', transporte = null, log = console } = {}) {
    this.appUrl = appUrl;
    this.from = smtp.from || smtp.user || '';
    this.logo = urlEscudo(appUrl);
    this.log = log;
    const configurado = Boolean(smtp.host && this.from);
    this.habilitado = Boolean(transporte) || configurado;
    this.transporte = transporte || (configurado ? crearTransporte(smtp) : null);
  }

  enlaceSolicitud(id) {
    return `${this.appUrl}/solicitudes/${id}`;
  }

  async enviar({ para, asunto, nombre, texto, enlace }) {
    if (!this.habilitado || !para) return false;
    const primerNombre = String(nombre || '').split(' ')[0];
    const saludo = primerNombre ? `Hola, ${primerNombre}` : 'Hola';
    try {
      await this.transporte.sendMail({
        from: this.from,
        to: para,
        subject: `[UniSolicita] ${asunto}`.slice(0, 150),
        text: `${saludo}\n\n${texto}${enlace ? `\n\nAbrir la solicitud: ${enlace}` : ''}\n`,
        html: plantilla({ saludo, texto, enlace, textoEnlace: 'Abrir la solicitud', logo: this.logo }),
      });
      return true;
    } catch (err) {
      this.log.error(`No se pudo enviar el correo a ${para}: ${err.message}`);
      return false;
    }
  }
}

module.exports = { CorreoService };
