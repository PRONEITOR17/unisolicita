-- UniSolicita · Esquema relacional (PostgreSQL)
-- Se puede ejecutar varias veces: usa IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS rol (
  id_rol SERIAL PRIMARY KEY,
  nombre VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS usuario (
  id_usuario SERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  correo VARCHAR(160) NOT NULL UNIQUE,
  contrasena_hash VARCHAR(100) NOT NULL,
  id_rol INT NOT NULL REFERENCES rol (id_rol),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categoria (
  id_categoria SERIAL PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL UNIQUE,
  descripcion VARCHAR(255),
  activa BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE SEQUENCE IF NOT EXISTS solicitud_numero_seq;

CREATE TABLE IF NOT EXISTS solicitud (
  id_solicitud SERIAL PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  fecha_registro TIMESTAMPTZ NOT NULL DEFAULT now(),
  id_solicitante INT NOT NULL REFERENCES usuario (id_usuario),
  id_categoria INT NOT NULL REFERENCES categoria (id_categoria),
  descripcion TEXT NOT NULL CHECK (length(trim(descripcion)) > 0),
  prioridad VARCHAR(10) NOT NULL CHECK (prioridad IN ('BAJA', 'MEDIA', 'ALTA')),
  id_responsable INT REFERENCES usuario (id_usuario),
  estado VARCHAR(15) NOT NULL DEFAULT 'REGISTRADA'
    CHECK (estado IN ('REGISTRADA', 'ASIGNADA', 'EN_PROCESO', 'RESUELTA', 'CERRADA', 'RECHAZADA', 'REABIERTA')),
  solucion TEXT,
  -- RN05: no hay RESUELTA ni CERRADA sin solución registrada
  CONSTRAINT ck_solucion_requerida
    CHECK (estado NOT IN ('RESUELTA', 'CERRADA') OR length(trim(coalesce(solucion, ''))) > 0),
  -- Solo REGISTRADA y RECHAZADA pueden existir sin responsable
  CONSTRAINT ck_responsable_requerido
    CHECK (estado IN ('REGISTRADA', 'RECHAZADA') OR id_responsable IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS movimiento (
  id_movimiento SERIAL PRIMARY KEY,
  id_solicitud INT NOT NULL REFERENCES solicitud (id_solicitud),
  id_usuario INT NOT NULL REFERENCES usuario (id_usuario),
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  tipo VARCHAR(15) NOT NULL CHECK (tipo IN ('ESTADO', 'ASIGNACION', 'OBSERVACION')),
  estado_anterior VARCHAR(15),
  estado_nuevo VARCHAR(15) NOT NULL,
  observacion TEXT
);

CREATE TABLE IF NOT EXISTS notificacion (
  id_notificacion SERIAL PRIMARY KEY,
  id_usuario INT NOT NULL REFERENCES usuario (id_usuario),
  id_solicitud INT NOT NULL REFERENCES solicitud (id_solicitud),
  mensaje VARCHAR(255) NOT NULL,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  leida BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS ix_solicitud_estado ON solicitud (estado);
CREATE INDEX IF NOT EXISTS ix_solicitud_solicitante ON solicitud (id_solicitante);
CREATE INDEX IF NOT EXISTS ix_solicitud_responsable ON solicitud (id_responsable);
CREATE INDEX IF NOT EXISTS ix_solicitud_categoria ON solicitud (id_categoria);
CREATE INDEX IF NOT EXISTS ix_solicitud_fecha ON solicitud (fecha_registro);
CREATE INDEX IF NOT EXISTS ix_movimiento_solicitud ON movimiento (id_solicitud, fecha);
CREATE INDEX IF NOT EXISTS ix_notificacion_usuario ON notificacion (id_usuario, leida);

-- RN07: el historial no se edita ni se borra
CREATE OR REPLACE FUNCTION movimiento_inmutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'El historial de una solicitud no se puede modificar ni eliminar';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_movimiento_inmutable ON movimiento;
CREATE TRIGGER trg_movimiento_inmutable
  BEFORE UPDATE OR DELETE ON movimiento
  FOR EACH ROW EXECUTE FUNCTION movimiento_inmutable();
