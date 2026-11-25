'use strict';
const { crearRepos } = require('../repositories');
const { ValidationError, NoEncontradoError } = require('../errors');
const validar = require('./validar');

class CategoriaService {
  constructor({ db }) {
    this.db = db;
  }

  listar(opciones) {
    return crearRepos(this.db).categorias.listar(opciones);
  }

  async _validar(repos, entrada, idActual = null) {
    const nombre = validar.requerido(entrada.nombre, 'El nombre de la categoría', { min: 3, max: 80 });
    const descripcion = validar.texto(entrada.descripcion).slice(0, 255);
    const existente = await repos.categorias.porNombre(nombre);
    if (existente && existente.id !== idActual) {
      throw new ValidationError('Ya existe una categoría con ese nombre.');
    }
    return { nombre, descripcion };
  }

  async crear(entrada) {
    const repos = crearRepos(this.db);
    return repos.categorias.crear(await this._validar(repos, entrada));
  }

  async actualizar(id, entrada) {
    const repos = crearRepos(this.db);
    if (!(await repos.categorias.porId(id))) throw new NoEncontradoError('La categoría no existe.');
    return repos.categorias.actualizar(id, await this._validar(repos, entrada, id));
  }

  async cambiarActiva(id, activa) {
    const repos = crearRepos(this.db);
    if (!(await repos.categorias.porId(id))) throw new NoEncontradoError('La categoría no existe.');
    await repos.categorias.cambiarActiva(id, activa); // RN12: se desactiva, nunca se elimina
  }
}

module.exports = { CategoriaService };
