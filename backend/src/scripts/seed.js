// Crea los dos administradores (Admin y Root) y datos de ejemplo.
// Se puede ejecutar varias veces: restablece las contraseñas sin duplicar datos.
import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';

const COSTO = 12;

// Contraseñas pedidas por el laboratorio. Solo se guarda su hash bcrypt.
const ADMINS = [
  { nombre: 'Administrador', username: 'Admin', email: 'admin@escuela.local', password: '$3cr3t' },
  { nombre: 'Root', username: 'Root', email: 'root@escuela.local', password: 'W@t@SHi09' },
];

const MAESTROS = [
  ['Laura', 'Hernández Ruiz', 'laura.hernandez@escuela.local', '6671234567', 'Matemáticas'],
  ['Carlos', 'Méndez Soto', 'carlos.mendez@escuela.local', '6672345678', 'Programación'],
  ['Ana', 'Torres Villa', 'ana.torres@escuela.local', '6673456789', 'Bases de datos'],
];

const MATERIAS = [
  ['MAT101', 'Cálculo Diferencial', 5, 'laura.hernandez@escuela.local'],
  ['PRG101', 'Fundamentos de Programación', 6, 'carlos.mendez@escuela.local'],
  ['BD201', 'Bases de Datos', 5, 'ana.torres@escuela.local'],
];

const GRUPOS = [
  ['1A', 1, 'Matutino', '2026-2027'],
  ['1B', 1, 'Vespertino', '2026-2027'],
  ['3A', 3, 'Matutino', '2026-2027'],
];

const ALUMNOS = [
  ['A2026001', 'Sofía', 'García López', 'sofia.garcia@alumnos.local', '2007-03-14', '1A', 'MAT101'],
  ['A2026002', 'Diego', 'Ramírez Pérez', 'diego.ramirez@alumnos.local', '2007-08-22', '1A', 'PRG101'],
  ['A2026003', 'Valeria', 'Castro Núñez', 'valeria.castro@alumnos.local', '2006-11-05', '1B', 'MAT101'],
  ['A2026004', 'Mateo', 'Flores Ortiz', 'mateo.flores@alumnos.local', '2005-01-30', '3A', 'BD201'],
];

async function seed() {
  // 1) Administradores: UPDATE si existe, INSERT si no (los triggers limitan a 2)
  for (const a of ADMINS) {
    const hash = await bcrypt.hash(a.password, COSTO);
    const [r] = await pool.query(
      'UPDATE usuarios SET password_hash = ?, rol = ?, activo = 1, ' +
        'intentos_fallidos = 0, bloqueado_hasta = NULL WHERE username = ?',
      [hash, 'admin', a.username],
    );
    if (r.affectedRows === 0) {
      await pool.query(
        'INSERT INTO usuarios (nombre, username, email, password_hash, rol) VALUES (?, ?, ?, ?, ?)',
        [a.nombre, a.username, a.email, hash, 'admin'],
      );
      console.log(`👤 Administrador ${a.username} creado`);
    } else {
      console.log(`🔑 Contraseña de ${a.username} restablecida`);
    }
  }

  // 2) Catálogos de ejemplo (INSERT IGNORE no duplica por las llaves UNIQUE)
  for (const m of MAESTROS) {
    await pool.query(
      'INSERT IGNORE INTO maestros (nombre, apellidos, email, telefono, especialidad) VALUES (?, ?, ?, ?, ?)',
      m,
    );
  }
  for (const [clave, nombre, creditos, emailMaestro] of MATERIAS) {
    await pool.query(
      'INSERT IGNORE INTO materias (clave, nombre, creditos, maestro_id) ' +
        'VALUES (?, ?, ?, (SELECT id FROM maestros WHERE email = ?))',
      [clave, nombre, creditos, emailMaestro],
    );
  }
  for (const g of GRUPOS) {
    await pool.query(
      'INSERT IGNORE INTO grupos (nombre, grado, turno, ciclo) VALUES (?, ?, ?, ?)',
      g,
    );
  }
  for (const [matricula, nombre, apellidos, email, fecha, grupo, materia] of ALUMNOS) {
    await pool.query(
      'INSERT IGNORE INTO alumnos (matricula, nombre, apellidos, email, fecha_nacimiento, grupo_id, materia_id) ' +
        'VALUES (?, ?, ?, ?, ?, (SELECT id FROM grupos WHERE nombre = ? LIMIT 1), ' +
        '(SELECT id FROM materias WHERE clave = ?))',
      [matricula, nombre, apellidos, email, fecha, grupo, materia],
    );
  }
  console.log('📚 Datos de ejemplo listos');
}

try {
  await seed();
  console.log('✅ Seed completado');
} catch (err) {
  console.error('❌ Error en el seed:', err.sqlMessage ?? err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
