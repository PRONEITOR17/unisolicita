-- UniSolicita · Datos iniciales
-- Solo datos que el sistema necesita para funcionar: roles y categorías.
-- Los usuarios de demostración están aparte, en db/seed_demo.sql.

INSERT INTO rol (nombre) VALUES
  ('ADMINISTRADOR'), ('ESTUDIANTE'), ('FUNCIONARIO'), ('SUPERVISOR')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO categoria (nombre, descripcion) VALUES
  ('Certificados y constancias', 'Certificados de estudio, notas y constancias de matrícula'),
  ('Matrícula y registro', 'Inscripciones, cancelaciones, homologaciones y cambios de programa'),
  ('Apoyo financiero', 'Becas, descuentos, financiación y pagos'),
  ('Bienestar universitario', 'Orientación, salud, deporte y actividades culturales'),
  ('Soporte tecnológico', 'Plataformas virtuales, correo institucional y conectividad'),
  ('Biblioteca y recursos', 'Préstamos, bases de datos y material bibliográfico')
ON CONFLICT (nombre) DO NOTHING;
