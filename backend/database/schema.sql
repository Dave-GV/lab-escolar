-- =============================================================
--  Laboratorio: Sistema Escolar  ·  Esquema de base de datos
--  Ejecutar como administrador de MariaDB:
--     sudo mariadb < backend/database/schema.sql
--  El script es idempotente: se puede ejecutar varias veces.
-- =============================================================

CREATE DATABASE IF NOT EXISTS lab_escolar
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE lab_escolar;

-- -------------------------------------------------------------
-- Usuarios del sistema (login)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre            VARCHAR(100) NOT NULL,
  username          VARCHAR(50)  NOT NULL,
  email             VARCHAR(120) NULL,
  password_hash     VARCHAR(255) NOT NULL,
  rol               ENUM('admin','usuario') NOT NULL DEFAULT 'usuario',
  foto              VARCHAR(100) NULL,
  activo            TINYINT(1)   NOT NULL DEFAULT 1,
  intentos_fallidos TINYINT UNSIGNED NOT NULL DEFAULT 0,
  bloqueado_hasta   DATETIME NULL,
  creado_en         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_usuarios_username UNIQUE (username),
  CONSTRAINT uq_usuarios_email    UNIQUE (email)
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- Maestros
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS maestros (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(80)  NOT NULL,
  apellidos    VARCHAR(100) NOT NULL,
  email        VARCHAR(120) NOT NULL,
  telefono     VARCHAR(20)  NULL,
  especialidad VARCHAR(100) NULL,
  creado_en    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_maestros_email UNIQUE (email)
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- Materias (cada materia la imparte un maestro)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS materias (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  clave      VARCHAR(20)  NOT NULL,
  nombre     VARCHAR(100) NOT NULL,
  creditos   TINYINT UNSIGNED NOT NULL DEFAULT 5,
  maestro_id INT UNSIGNED NULL,
  creado_en  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_materias_clave UNIQUE (clave),
  CONSTRAINT fk_materias_maestro FOREIGN KEY (maestro_id)
    REFERENCES maestros(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- Grupos
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grupos (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre    VARCHAR(20) NOT NULL,
  grado     TINYINT UNSIGNED NOT NULL,
  turno     ENUM('Matutino','Vespertino') NOT NULL DEFAULT 'Matutino',
  ciclo     VARCHAR(20) NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_grupos_nombre_ciclo UNIQUE (nombre, ciclo)
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- Alumnos (pertenecen a un grupo y cursan una materia)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alumnos (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  matricula        VARCHAR(20)  NOT NULL,
  nombre           VARCHAR(80)  NOT NULL,
  apellidos        VARCHAR(100) NOT NULL,
  email            VARCHAR(120) NULL,
  fecha_nacimiento DATE NULL,
  grupo_id         INT UNSIGNED NULL,
  materia_id       INT UNSIGNED NULL,
  creado_en        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_alumnos_matricula UNIQUE (matricula),
  CONSTRAINT uq_alumnos_email     UNIQUE (email),
  CONSTRAINT fk_alumnos_grupo FOREIGN KEY (grupo_id)
    REFERENCES grupos(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_alumnos_materia FOREIGN KEY (materia_id)
    REFERENCES materias(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- Reglas de negocio en la base de datos (triggers)
--   · Nunca puede haber más de dos administradores.
--   · Un administrador no puede ser borrado ni degradado.
--   Aunque alguien salte la API, la base de datos lo impide.
-- -------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_usuarios_max_admin_insert;
DROP TRIGGER IF EXISTS trg_usuarios_max_admin_update;
DROP TRIGGER IF EXISTS trg_usuarios_no_borrar_admin;

DELIMITER //

CREATE TRIGGER trg_usuarios_max_admin_insert
BEFORE INSERT ON usuarios
FOR EACH ROW
BEGIN
  IF NEW.rol = 'admin' AND
     (SELECT COUNT(*) FROM usuarios WHERE rol = 'admin') >= 2 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Solo se permiten dos administradores';
  END IF;
END//

CREATE TRIGGER trg_usuarios_max_admin_update
BEFORE UPDATE ON usuarios
FOR EACH ROW
BEGIN
  IF OLD.rol = 'admin' AND NEW.rol <> 'admin' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'No se puede quitar el rol a un administrador';
  END IF;
  IF NEW.rol = 'admin' AND OLD.rol <> 'admin' AND
     (SELECT COUNT(*) FROM usuarios WHERE rol = 'admin') >= 2 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Solo se permiten dos administradores';
  END IF;
END//

CREATE TRIGGER trg_usuarios_no_borrar_admin
BEFORE DELETE ON usuarios
FOR EACH ROW
BEGIN
  IF OLD.rol = 'admin' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'No se puede eliminar a un administrador';
  END IF;
END//

DELIMITER ;

-- -------------------------------------------------------------
-- Usuario de la aplicación con mínimo privilegio
-- (solo SELECT, INSERT, UPDATE y DELETE sobre lab_escolar).
-- >>> CAMBIA LA CONTRASEÑA por una tuya y ponla igual en backend/.env <<<
-- -------------------------------------------------------------
CREATE USER IF NOT EXISTS 'lab_app'@'localhost' IDENTIFIED BY 'ET5ydCW-xCHJwhj2BMtvNC1V';
CREATE USER IF NOT EXISTS 'lab_app'@'127.0.0.1' IDENTIFIED BY 'ET5ydCW-xCHJwhj2BMtvNC1V';
ALTER USER 'lab_app'@'localhost' IDENTIFIED BY 'ET5ydCW-xCHJwhj2BMtvNC1V';
ALTER USER 'lab_app'@'127.0.0.1' IDENTIFIED BY 'ET5ydCW-xCHJwhj2BMtvNC1V';

GRANT SELECT, INSERT, UPDATE, DELETE ON lab_escolar.* TO 'lab_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON lab_escolar.* TO 'lab_app'@'127.0.0.1';
FLUSH PRIVILEGES;
