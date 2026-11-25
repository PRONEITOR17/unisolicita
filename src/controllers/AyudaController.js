'use strict';
const { ROLES, ESTADOS_GUIA, guiaDeRol } = require('../content/guia');

/** Guía de uso: cada persona ve la de su rol y puede consultar la de los demás. */
class AyudaController {
  constructor(c) {
    this.c = c;
  }

  ver = (req, res) => {
    const pedido = String(req.query.rol || '').toUpperCase();
    const rolVista = ROLES.includes(pedido) ? pedido : req.usuario.rol;
    res.render('ayuda', {
      titulo: 'Ayuda',
      ruta: '/ayuda',
      rolVista,
      esPropia: rolVista === req.usuario.rol,
      guia: guiaDeRol(rolVista),
      roles: ROLES,
      estados: ESTADOS_GUIA,
    });
  };
}

module.exports = { AyudaController };
