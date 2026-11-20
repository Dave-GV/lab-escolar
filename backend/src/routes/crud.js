import { Router } from 'express';
import { pool } from '../config/db.js';
import { requiereSesion } from '../middleware/auth.js';
import { validar, validarId } from '../middleware/validar.js';
import { HttpError } from '../middleware/errores.js';

/**
 * Fábrica de rutas CRUD. Cada catálogo solo describe su tabla y su esquema.
 *
 * @param {object} cfg
 * @param {string} cfg.tabla    nombre de la tabla (lo define el programador, no el cliente)
 * @param {import('zod').ZodObject} cfg.esquema  lista blanca de campos + validación
 * @param {string} cfg.nombre   nombre en singular para los mensajes
 * @param {string} [cfg.select] SELECT con JOINs para mostrar nombres relacionados
 * @param {string} [cfg.orden]  columna de orden
 */
export function crearCrud({ tabla, esquema, nombre, select, orden = 'id' }) {
  const router = Router();
  router.use(requiereSesion);

  // ?? escapa identificadores (tablas/columnas) y ? escapa valores
  const consultaBase = select ?? 'SELECT t.* FROM ?? t';

  async function buscar(id) {
    const [[fila]] = await pool.query(`${consultaBase} WHERE t.id = ?`, [tabla, id]);
    if (!fila) throw new HttpError(404, `${nombre} no encontrado`);
    return fila;
  }

  router.get('/', async (req, res) => {
    const [filas] = await pool.query(`${consultaBase} ORDER BY ??`, [tabla, `t.${orden}`]);
    res.json(filas);
  });

  router.get('/:id', validarId, async (req, res) => {
    res.json(await buscar(req.id));
  });

  router.post('/', validar(esquema), async (req, res) => {
    // req.body ya solo contiene campos permitidos por el esquema
    const [r] = await pool.query('INSERT INTO ?? SET ?', [tabla, req.body]);
    res.status(201).json(await buscar(r.insertId));
  });

  router.put('/:id', validarId, validar(esquema), async (req, res) => {
    const [r] = await pool.query('UPDATE ?? SET ? WHERE id = ?', [tabla, req.body, req.id]);
    if (r.affectedRows === 0) throw new HttpError(404, `${nombre} no encontrado`);
    res.json(await buscar(req.id));
  });

  router.delete('/:id', validarId, async (req, res) => {
    const [r] = await pool.query('DELETE FROM ?? WHERE id = ?', [tabla, req.id]);
    if (r.affectedRows === 0) throw new HttpError(404, `${nombre} no encontrado`);
    res.status(204).end();
  });

  return router;
}
