-- UniSolicita · Usuarios de demostración (NO usar en producción)
-- Contraseña de todos: Demo1234*

INSERT INTO usuario (nombre, correo, contrasena_hash, id_rol)
SELECT v.nombre, v.correo, '$2b$10$uDWFNSnmqmTjtPNYAtocw.R84HYIafxbZWuNrCC8MqhKYWw803QBe', r.id_rol
FROM (VALUES
  ('Administrador Demo',  'admin@unisolicita.edu',        'ADMINISTRADOR'),
  ('Supervisor Demo',     'supervisor@unisolicita.edu',   'SUPERVISOR'),
  ('Funcionario Uno',     'funcionario1@unisolicita.edu', 'FUNCIONARIO'),
  ('Funcionario Dos',     'funcionario2@unisolicita.edu', 'FUNCIONARIO'),
  ('Estudiante Uno',      'estudiante1@unisolicita.edu',  'ESTUDIANTE'),
  ('Estudiante Dos',      'estudiante2@unisolicita.edu',  'ESTUDIANTE')
) AS v (nombre, correo, rol)
JOIN rol r ON r.nombre = v.rol
ON CONFLICT (correo) DO NOTHING;
