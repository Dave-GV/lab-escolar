import { Router } from 'express';
import { pool } from '../config/db.js';
import { requiereSesion } from '../middleware/auth.js';
import { crearCrud } from './crud.js';
import * as esquemas from '../validators/esquemas.js';

const router = Router();

router.use('/maestros', crearCrud({
  tabla: 'maestros',
  nombre: 'Maestro',
  esquema: esquemas.maestro,
  orden: 'apellidos',
}));

router.use('/materias', crearCrud({
  tabla: 'materias',
  nombre: 'Materia',
  esquema: esquemas.materia,
  orden: 'clave',
  select: `SELECT t.*, CONCAT(m.nombre, ' ', m.apellidos) AS maestro
           FROM ?? t LEFT JOIN maestros m ON m.id = t.maestro_id`,
}));

router.use('/grupos', crearCrud({
  tabla: 'grupos',
  nombre: 'Grupo',
  esquema: esquemas.grupo,
  orden: 'nombre',
}));

router.use('/alumnos', crearCrud({
  tabla: 'alumnos',
  nombre: 'Alumno',
  esquema: esquemas.alumno,
  orden: 'apellidos',
  select: `SELECT t.*, g.nombre AS grupo, ma.nombre AS materia
           FROM ?? t
           LEFT JOIN grupos g    ON g.id  = t.grupo_id
           LEFT JOIN materias ma ON ma.id = t.materia_id`,
}));

// Totales para la pantalla de inicio
router.get('/resumen', requiereSesion, async (req, res) => {
  const [[totales]] = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM alumnos)  AS alumnos,
      (SELECT COUNT(*) FROM maestros) AS maestros,
      (SELECT COUNT(*) FROM materias) AS materias,
      (SELECT COUNT(*) FROM grupos)   AS grupos,
      (SELECT COUNT(*) FROM usuarios) AS usuarios`);
  res.json(totales);
});

export default router;
