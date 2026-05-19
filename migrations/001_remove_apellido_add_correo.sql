-- CREATE TABLE usuarios_ciafy_ciafy (
--   id_usuarioss_ciafy INTEGER PRIMARY KEY AUTOINCREMENT,
--   tipo_usuario TEXT NOT NULL,
--   nombre_usuario TEXT NOT NULL UNIQUE,
--   correo TEXT NOT NULL UNIQUE,
--   contrasena TEXT NOT NULL
-- );

-- INSERT INTO usuarios_ciafy_ciafy (id_usuarioss_ciafy, tipo_usuario, nombre_usuario, correo, contrasena)
-- SELECT id_usuarioss_ciafy, tipo_usuario, nombre_usuario, COALESCE(correo, ''), contrasena FROM usuarios_ciafy;

-- DROP TABLE usuarios_ciafy;

-- ALTER TABLE usuarios_ciafy_ciafy RENAME TO usuarios_ciafy;
