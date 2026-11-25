'use strict';
const { Usuario, Categoria, Movimiento, Notificacion, Solicitud } = require('../domain/models');

/** Convierte un objeto de filtros en cláusulas WHERE con parámetros numerados. */
function construirFiltros(f = {}) {
  const condiciones = [];
  const params = [];
  const agregar = (condicion, valor) => {
    params.push(valor);
    condiciones.push(condicion.replace('?', `$${params.length}`));
  };
  if (f.idSolicitante) agregar('s.id_solicitante = ?', f.idSolicitante);
  if (f.idResponsable) agregar('s.id_responsable = ?', f.idResponsable);
  if (f.sinResponsable) condiciones.push('s.id_responsable IS NULL');
  if (f.estado) agregar('s.estado = ?', f.estado);
  if (f.idCategoria) agregar('s.id_categoria = ?', f.idCategoria);
  if (f.prioridad) agregar('s.prioridad = ?', f.prioridad);
  if (f.desde) agregar('s.fecha_registro >= ?::date', f.desde);
  if (f.hasta) agregar("s.fecha_registro < (?::date + 1)", f.hasta);
  if (f.texto) {
    params.push(`%${f.texto}%`);
    const n = `$${params.length}`;
    condiciones.push(`(s.codigo ILIKE ${n} OR s.descripcion ILIKE ${n})`);
  }
  return {
    where: condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '',
    params,
  };
}

class RolRepository {
  constructor(q) {
    this.q = q;
  }

  async listar() {
    const { rows } = await this.q.query('SELECT id_rol, nombre FROM rol ORDER BY nombre');
    return rows.map((r) => ({ id: r.id_rol, nombre: r.nombre }));
  }
}

class UsuarioRepository {
  constructor(q) {
    this.q = q;
  }

  static BASE = 'SELECT u.*, r.nombre AS rol FROM usuario u JOIN rol r ON r.id_rol = u.id_rol';

  async porId(id) {
    const { rows } = await this.q.query(`${UsuarioRepository.BASE} WHERE u.id_usuario = $1`, [id]);
    return rows[0] ? new Usuario(rows[0]) : null;
  }

  async porCorreo(correo) {
    const { rows } = await this.q.query(`${UsuarioRepository.BASE} WHERE u.correo = $1`, [correo]);
    return rows[0] ? new Usuario(rows[0]) : null;
  }

  async listar({ rol } = {}) {
    const params = [];
    let where = '';
    if (rol) {
      params.push(rol);
      where = 'WHERE r.nombre = $1';
    }
    const { rows } = await this.q.query(
      `${UsuarioRepository.BASE} ${where} ORDER BY u.activo DESC, u.nombre`,
      params,
    );
    return rows.map((f) => new Usuario(f));
  }

  async activosConRol(rol) {
    const { rows } = await this.q.query(
      `${UsuarioRepository.BASE} WHERE r.nombre = $1 AND u.activo ORDER BY u.nombre`,
      [rol],
    );
    return rows.map((f) => new Usuario(f));
  }

  administradoresActivos() {
    return this.activosConRol('ADMINISTRADOR');
  }

  funcionariosActivos() {
    return this.activosConRol('FUNCIONARIO');
  }

  async crear({ nombre, correo, hash, idRol }) {
    const { rows } = await this.q.query(
      `INSERT INTO usuario (nombre, correo, contrasena_hash, id_rol)
       VALUES ($1, $2, $3, $4) RETURNING id_usuario`,
      [nombre, correo, hash, idRol],
    );
    return this.porId(rows[0].id_usuario);
  }

  async actualizar(id, { nombre, correo, idRol, hash }) {
    await this.q.query(
      `UPDATE usuario SET nombre = $2, correo = $3, id_rol = $4,
         contrasena_hash = COALESCE($5, contrasena_hash)
       WHERE id_usuario = $1`,
      [id, nombre, correo, idRol, hash || null],
    );
    return this.porId(id);
  }

  async cambiarActivo(id, activo) {
    await this.q.query('UPDATE usuario SET activo = $2 WHERE id_usuario = $1', [id, activo]);
  }

  async actualizarHash(id, hash) {
    await this.q.query('UPDATE usuario SET contrasena_hash = $2 WHERE id_usuario = $1', [id, hash]);
  }
}

class CategoriaRepository {
  constructor(q) {
    this.q = q;
  }

  async listar({ soloActivas = false } = {}) {
    const where = soloActivas ? 'WHERE activa' : '';
    const { rows } = await this.q.query(
      `SELECT * FROM categoria ${where} ORDER BY activa DESC, nombre`,
    );
    return rows.map((f) => new Categoria(f));
  }

  async porId(id) {
    const { rows } = await this.q.query('SELECT * FROM categoria WHERE id_categoria = $1', [id]);
    return rows[0] ? new Categoria(rows[0]) : null;
  }

  async porNombre(nombre) {
    const { rows } = await this.q.query('SELECT * FROM categoria WHERE lower(nombre) = lower($1)', [
      nombre,
    ]);
    return rows[0] ? new Categoria(rows[0]) : null;
  }

  async crear({ nombre, descripcion }) {
    const { rows } = await this.q.query(
      'INSERT INTO categoria (nombre, descripcion) VALUES ($1, $2) RETURNING *',
      [nombre, descripcion || null],
    );
    return new Categoria(rows[0]);
  }

  async actualizar(id, { nombre, descripcion }) {
    await this.q.query(
      'UPDATE categoria SET nombre = $2, descripcion = $3 WHERE id_categoria = $1',
      [id, nombre, descripcion || null],
    );
    return this.porId(id);
  }

  async cambiarActiva(id, activa) {
    await this.q.query('UPDATE categoria SET activa = $2 WHERE id_categoria = $1', [id, activa]);
  }
}

class SolicitudRepository {
  constructor(q) {
    this.q = q;
  }

  static BASE = `
    SELECT s.*, c.nombre AS categoria, u.nombre AS solicitante, r.nombre AS responsable
    FROM solicitud s
    JOIN categoria c ON c.id_categoria = s.id_categoria
    JOIN usuario u ON u.id_usuario = s.id_solicitante
    LEFT JOIN usuario r ON r.id_usuario = s.id_responsable`;

  async crear({ idSolicitante, idCategoria, descripcion, prioridad }) {
    const { rows } = await this.q.query(
      `INSERT INTO solicitud (codigo, id_solicitante, id_categoria, descripcion, prioridad)
       VALUES ('SOL-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('solicitud_numero_seq')::text, 5, '0'),
               $1, $2, $3, $4)
       RETURNING id_solicitud`,
      [idSolicitante, idCategoria, descripcion, prioridad],
    );
    return this.porId(rows[0].id_solicitud);
  }

  async porId(id, { bloquear = false } = {}) {
    const bloqueo = bloquear ? 'FOR UPDATE OF s' : '';
    const { rows } = await this.q.query(
      `${SolicitudRepository.BASE} WHERE s.id_solicitud = $1 ${bloqueo}`,
      [id],
    );
    return rows[0] ? new Solicitud(rows[0]) : null;
  }

  async listar(filtros = {}, limite = 200) {
    const { where, params } = construirFiltros(filtros);
    const tope = Math.min(Math.max(Number(limite) || 200, 1), 1000);
    const { rows } = await this.q.query(
      `${SolicitudRepository.BASE} ${where}
       ORDER BY s.fecha_registro DESC, s.id_solicitud DESC LIMIT ${tope}`,
      params,
    );
    return rows.map((f) => new Solicitud(f));
  }

  async contarPorEstado(filtros = {}) {
    const { where, params } = construirFiltros(filtros);
    const { rows } = await this.q.query(
      `SELECT s.estado, COUNT(*)::int AS total FROM solicitud s ${where} GROUP BY s.estado`,
      params,
    );
    return Object.fromEntries(rows.map((r) => [r.estado, r.total]));
  }

  async actualizar(id, { estado, idResponsable, solucion }) {
    await this.q.query(
      `UPDATE solicitud SET estado = COALESCE($2, estado),
         id_responsable = COALESCE($3, id_responsable),
         solucion = COALESCE($4, solucion)
       WHERE id_solicitud = $1`,
      [id, estado || null, idResponsable || null, solucion || null],
    );
  }
}

class MovimientoRepository {
  constructor(q) {
    this.q = q;
  }

  async registrar({ idSolicitud, idUsuario, tipo, estadoAnterior, estadoNuevo, observacion }) {
    await this.q.query(
      `INSERT INTO movimiento (id_solicitud, id_usuario, tipo, estado_anterior, estado_nuevo, observacion)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [idSolicitud, idUsuario, tipo, estadoAnterior || null, estadoNuevo, observacion || null],
    );
  }

  async porSolicitud(idSolicitud) {
    const { rows } = await this.q.query(
      `SELECT m.*, u.nombre AS usuario, r.nombre AS rol_usuario
       FROM movimiento m
       JOIN usuario u ON u.id_usuario = m.id_usuario
       JOIN rol r ON r.id_rol = u.id_rol
       WHERE m.id_solicitud = $1
       ORDER BY m.fecha, m.id_movimiento`,
      [idSolicitud],
    );
    return rows.map((f) => new Movimiento(f));
  }
}

class NotificacionRepository {
  constructor(q) {
    this.q = q;
  }

  async crear({ idUsuario, idSolicitud, mensaje }) {
    await this.q.query(
      'INSERT INTO notificacion (id_usuario, id_solicitud, mensaje) VALUES ($1, $2, $3)',
      [idUsuario, idSolicitud, mensaje],
    );
  }

  async porUsuario(idUsuario, limite = 100) {
    const { rows } = await this.q.query(
      `SELECT n.*, s.codigo FROM notificacion n
       JOIN solicitud s ON s.id_solicitud = n.id_solicitud
       WHERE n.id_usuario = $1
       ORDER BY n.fecha DESC, n.id_notificacion DESC LIMIT ${Number(limite)}`,
      [idUsuario],
    );
    return rows.map((f) => new Notificacion(f));
  }

  async contarNoLeidas(idUsuario) {
    const { rows } = await this.q.query(
      'SELECT COUNT(*)::int AS total FROM notificacion WHERE id_usuario = $1 AND NOT leida',
      [idUsuario],
    );
    return rows[0].total;
  }

  /** Para el aviso en vivo: cuántas hay sin leer, el último id y las no leídas posteriores a `desde`. */
  async novedades(idUsuario, desde = 0, limite = 5) {
    const { rows: resumen } = await this.q.query(
      `SELECT COUNT(*) FILTER (WHERE NOT leida)::int AS sin_leer, COALESCE(MAX(id_notificacion), 0)::int AS ultimo
       FROM notificacion WHERE id_usuario = $1`,
      [idUsuario],
    );
    const { rows: nuevas } = await this.q.query(
      `SELECT n.id_notificacion AS id, n.mensaje, n.id_solicitud AS solicitud, s.codigo
       FROM notificacion n JOIN solicitud s ON s.id_solicitud = n.id_solicitud
       WHERE n.id_usuario = $1 AND n.id_notificacion > $2 AND NOT n.leida
       ORDER BY n.id_notificacion ASC LIMIT ${Number(limite)}`,
      [idUsuario, desde],
    );
    return { sinLeer: resumen[0].sin_leer, ultimoId: resumen[0].ultimo, nuevas };
  }

  async marcarLeida(id, idUsuario) {
    await this.q.query(
      'UPDATE notificacion SET leida = TRUE WHERE id_notificacion = $1 AND id_usuario = $2',
      [id, idUsuario],
    );
  }

  async marcarTodas(idUsuario) {
    await this.q.query('UPDATE notificacion SET leida = TRUE WHERE id_usuario = $1', [idUsuario]);
  }
}

class ReporteRepository {
  constructor(q) {
    this.q = q;
  }

  async agrupar(expresion, uniones, filtros) {
    const { where, params } = construirFiltros(filtros);
    const { rows } = await this.q.query(
      `SELECT ${expresion} AS clave, COUNT(*)::int AS total
       FROM solicitud s ${uniones} ${where} GROUP BY 1 ORDER BY total DESC, 1`,
      params,
    );
    return rows;
  }

  async total(filtros) {
    const { where, params } = construirFiltros(filtros);
    const { rows } = await this.q.query(
      `SELECT COUNT(*)::int AS total FROM solicitud s ${where}`,
      params,
    );
    return rows[0].total;
  }

  /** Horas promedio entre el registro y la primera vez que la solicitud quedó RESUELTA. */
  async horasPromedioResolucion(filtros) {
    const { where, params } = construirFiltros(filtros);
    const { rows } = await this.q.query(
      `SELECT ROUND(AVG(EXTRACT(EPOCH FROM (m.fecha - s.fecha_registro)) / 3600)::numeric, 1)::float8 AS horas
       FROM solicitud s
       JOIN LATERAL (
         SELECT MIN(fecha) AS fecha FROM movimiento
         WHERE id_solicitud = s.id_solicitud AND estado_nuevo = 'RESUELTA'
       ) m ON m.fecha IS NOT NULL
       ${where}`,
      params,
    );
    return rows[0].horas;
  }
}

/** Crea todos los repositorios sobre una conexión o una transacción. */
function crearRepos(q) {
  return {
    roles: new RolRepository(q),
    usuarios: new UsuarioRepository(q),
    categorias: new CategoriaRepository(q),
    solicitudes: new SolicitudRepository(q),
    movimientos: new MovimientoRepository(q),
    notificaciones: new NotificacionRepository(q),
    reportes: new ReporteRepository(q),
  };
}

module.exports = { crearRepos, construirFiltros };
