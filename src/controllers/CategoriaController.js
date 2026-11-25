'use strict';
const { AppError } = require('../errors');

class CategoriaController {
  constructor(c) {
    this.c = c;
  }

  listar = async (req, res) => {
    res.render('categorias/lista', {
      titulo: 'Categorías',
      ruta: '/categorias',
      categorias: await this.c.categorias.listar(),
      editando: null,
      valores: { nombre: '', descripcion: '' },
      error: null,
    });
  };

  _intentar = (fn, exito) => async (req, res) => {
    try {
      await fn(req);
      res.flash('exito', exito(req));
    } catch (err) {
      if (!(err instanceof AppError) || err.status >= 403) throw err;
      res.flash('error', err.message);
    }
    res.redirect('/categorias');
  };

  crear = this._intentar(
    (req) => this.c.categorias.crear(req.body),
    () => 'Categoría creada.',
  );

  actualizar = this._intentar(
    (req) => this.c.categorias.actualizar(Number(req.params.id), req.body),
    () => 'Categoría actualizada.',
  );

  cambiarActiva = this._intentar(
    (req) => this.c.categorias.cambiarActiva(Number(req.params.id), req.body.activa === 'true'),
    (req) => (req.body.activa === 'true' ? 'Categoría activada.' : 'Categoría desactivada.'),
  );
}

module.exports = { CategoriaController };
