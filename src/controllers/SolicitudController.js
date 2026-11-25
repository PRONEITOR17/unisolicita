'use strict';
const { AppError } = require('../errors');

class SolicitudController {
  constructor(c) {
    this.c = c;
  }

  _formularioNuevo = async (res, extra = {}) => {
    const categorias = await this.c.categorias.listar({ soloActivas: true });
    res.render('solicitudes/nueva', {
      titulo: 'Nueva solicitud',
      ruta: '/solicitudes',
      categorias,
      valores: { categoria: '', prioridad: 'MEDIA', descripcion: '' },
      error: null,
      ...extra,
    });
  };

  listar = async (req, res) => {
    const [solicitudes, categorias, funcionarios] = await Promise.all([
      this.c.solicitudes.listar(req.usuario, req.query),
      this.c.categorias.listar(),
      req.usuario.rol === 'ADMINISTRADOR' || req.usuario.rol === 'SUPERVISOR'
        ? this.c.usuarios.listar({ rol: 'FUNCIONARIO' })
        : Promise.resolve([]),
    ]);
    res.render('solicitudes/lista', {
      titulo: 'Solicitudes',
      ruta: '/solicitudes',
      solicitudes,
      categorias,
      funcionarios,
      q: req.query,
    });
  };

  nueva = (req, res) => this._formularioNuevo(res);

  crear = async (req, res) => {
    try {
      const solicitud = await this.c.solicitudes.registrar(req.usuario, req.body);
      res.flash('exito', `Solicitud ${solicitud.codigo} registrada. Te avisaremos cuando cambie de estado.`);
      return res.redirect(`/solicitudes/${solicitud.id}`);
    } catch (err) {
      if (!(err instanceof AppError) || err.status >= 403) throw err;
      return this._formularioNuevo(res.status(err.status), {
        valores: {
          categoria: req.body.categoria || '',
          prioridad: req.body.prioridad || 'MEDIA',
          descripcion: req.body.descripcion || '',
        },
        error: err.message,
      });
    }
  };

  detalle = async (req, res) => {
    const datos = await this.c.solicitudes.obtener(req.usuario, Number(req.params.id));
    res.render('solicitudes/detalle', {
      titulo: datos.solicitud.codigo,
      ruta: '/solicitudes',
      ...datos,
    });
  };

  /** Ejecuta una acción de escritura; si falla por regla de negocio, avisa y vuelve al detalle. */
  _accion = (fn, mensajeExito) => async (req, res) => {
    const id = Number(req.params.id);
    try {
      await fn(req, id);
      res.flash('exito', mensajeExito(req));
    } catch (err) {
      if (!(err instanceof AppError) || err.status === 404 || err.status === 403) throw err;
      res.flash('error', err.message);
    }
    res.redirect(`/solicitudes/${id}`);
  };

  asignar = this._accion(
    (req, id) => this.c.solicitudes.asignar(req.usuario, id, req.body),
    () => 'Responsable asignado correctamente.',
  );

  cambiarEstado = this._accion(
    (req, id) => this.c.solicitudes.cambiarEstado(req.usuario, id, req.body.estado, req.body.texto),
    () => 'El estado de la solicitud se actualizó.',
  );

  observar = this._accion(
    (req, id) => this.c.solicitudes.agregarObservacion(req.usuario, id, req.body.texto),
    () => 'Observación registrada en el historial.',
  );
}

module.exports = { SolicitudController };
