import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { CAMPOS_PUBLICOS, requiereSesion, soloAdmin } from '../middleware/auth.js';
import { validar, validarId } from '../middleware/validar.js';
import { HttpError } from '../middleware/errores.js';
import { borrarFoto } from '../middleware/subida.js';
import * as esquemas from '../validators/esquemas.js';
import { COSTO_BCRYPT } from './auth.routes.js';

const router = Router();
router.use(requiereSesion, soloAdmin);

async function buscar(id) {
  const [[u]] = await pool.query(`SELECT ${CAMPOS_PUBLICOS} FROM usuarios WHERE id = ?`, [id]);
  if (!u) throw new HttpError(404, 'Usuario no encontrado');
  return u;
}

// Los administradores no se pueden editar ni borrar desde la API
function protegerAdmin(u) {
  if (u.rol === 'admin') {
    throw new HttpError(403, 'Los administradores están protegidos');
  }
}

router.get('/', async (req, res) => {
  const [filas] = await pool.query(
    `SELECT ${CAMPOS_PUBLICOS} FROM usuarios ORDER BY rol, nombre`,
  );
  res.json(filas);
});

router.get('/:id', validarId, async (req, res) => {
  res.json(await buscar(req.id));
});

router.post('/', validar(esquemas.usuarioNuevo), async (req, res) => {
  const { nombre, username, email, password } = req.body;
  const hash = await bcrypt.hash(password, COSTO_BCRYPT);
  // El rol se fija aquí: nunca se toma del cliente
  const [r] = await pool.query(
    'INSERT INTO usuarios (nombre, username, email, password_hash, rol) VALUES (?, ?, ?, ?, ?)',
    [nombre, username, email ?? null, hash, 'usuario'],
  );
  res.status(201).json(await buscar(r.insertId));
});

router.put('/:id', validarId, validar(esquemas.usuarioEdicion), async (req, res) => {
  protegerAdmin(await buscar(req.id));
  const { nombre, username, email, password, activo } = req.body;

  const cambios = { nombre, username, email: email ?? null };
  if (activo !== undefined) cambios.activo = activo;
  if (password) cambios.password_hash = await bcrypt.hash(password, COSTO_BCRYPT);

  await pool.query('UPDATE usuarios SET ? WHERE id = ?', [cambios, req.id]);
  res.json(await buscar(req.id));
});

router.delete('/:id', validarId, async (req, res) => {
  const u = await buscar(req.id);
  protegerAdmin(u);
  await pool.query('DELETE FROM usuarios WHERE id = ?', [req.id]);
  await borrarFoto(u.foto);
  res.status(204).end();
});

export default router;
