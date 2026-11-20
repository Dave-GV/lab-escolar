import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { pool } from '../config/db.js';
import {
  CAMPOS_PUBLICOS, emitirSesion, cerrarSesion, requiereSesion,
} from '../middleware/auth.js';
import { validar } from '../middleware/validar.js';
import { HttpError } from '../middleware/errores.js';
import { subirFoto, guardarFoto, borrarFoto } from '../middleware/subida.js';
import * as esquemas from '../validators/esquemas.js';

const router = Router();

export const COSTO_BCRYPT = 12;
const MAX_INTENTOS = 5;
const MINUTOS_BLOQUEO = 15;

// Hash falso: si el usuario no existe, igual se compara contra algo para
// que la respuesta tarde lo mismo (evita enumerar usuarios por tiempo).
const HASH_FALSO = bcrypt.hashSync('usuario-inexistente', COSTO_BCRYPT);
const CREDENCIALES_INVALIDAS = 'Usuario o contraseña incorrectos';

// Límite por IP: 10 intentos fallidos cada 15 minutos (los exitosos no cuentan)
const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos desde este equipo. Espera 15 minutos.' },
});

router.post('/login', limiteLogin, validar(esquemas.login), async (req, res) => {
  const { username, password } = req.body;

  // Consulta parametrizada: el valor viaja separado del SQL
  const [filas] = await pool.query(
    'SELECT id, rol, activo, password_hash, intentos_fallidos, bloqueado_hasta, ' +
      '(bloqueado_hasta IS NOT NULL AND bloqueado_hasta > NOW()) AS bloqueado ' +
      'FROM usuarios WHERE username = ?',
    [username],
  );
  const usuario = filas[0];

  if (!usuario) {
    await bcrypt.compare(password, HASH_FALSO);
    throw new HttpError(401, CREDENCIALES_INVALIDAS);
  }

  if (usuario.bloqueado) {
    throw new HttpError(423, `Cuenta bloqueada temporalmente. Intenta en ${MINUTOS_BLOQUEO} minutos.`);
  }

  const correcta = await bcrypt.compare(password, usuario.password_hash);

  if (!correcta || !usuario.activo) {
    if (!correcta) {
      const intentos = usuario.intentos_fallidos + 1;
      if (intentos >= MAX_INTENTOS) {
        await pool.query(
          'UPDATE usuarios SET intentos_fallidos = 0, ' +
            'bloqueado_hasta = NOW() + INTERVAL ? MINUTE WHERE id = ?',
          [MINUTOS_BLOQUEO, usuario.id],
        );
        throw new HttpError(423, `Cuenta bloqueada temporalmente. Intenta en ${MINUTOS_BLOQUEO} minutos.`);
      }
      await pool.query('UPDATE usuarios SET intentos_fallidos = ? WHERE id = ?', [intentos, usuario.id]);
    }
    throw new HttpError(401, CREDENCIALES_INVALIDAS);
  }

  await pool.query(
    'UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?',
    [usuario.id],
  );
  emitirSesion(res, usuario);

  const [[publico]] = await pool.query(
    `SELECT ${CAMPOS_PUBLICOS} FROM usuarios WHERE id = ?`, [usuario.id],
  );
  res.json({ usuario: publico });
});

router.post('/logout', (req, res) => {
  cerrarSesion(res);
  res.json({ mensaje: 'Sesión cerrada' });
});

router.get('/me', requiereSesion, (req, res) => {
  res.json({ usuario: req.usuario });
});

router.put('/me/foto', requiereSesion, subirFoto, async (req, res) => {
  const nombre = await guardarFoto(req.file);
  const anterior = req.usuario.foto;
  await pool.query('UPDATE usuarios SET foto = ? WHERE id = ?', [nombre, req.usuario.id]);
  await borrarFoto(anterior);
  res.json({ foto: nombre });
});

router.put('/me/password', requiereSesion, validar(esquemas.cambioPassword), async (req, res) => {
  const { actual, nueva } = req.body;
  const [[fila]] = await pool.query(
    'SELECT password_hash FROM usuarios WHERE id = ?', [req.usuario.id],
  );
  if (!(await bcrypt.compare(actual, fila.password_hash))) {
    throw new HttpError(400, 'La contraseña actual no es correcta');
  }
  if (actual === nueva) {
    throw new HttpError(400, 'La nueva contraseña debe ser distinta a la actual');
  }
  const hash = await bcrypt.hash(nueva, COSTO_BCRYPT);
  await pool.query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [hash, req.usuario.id]);
  res.json({ mensaje: 'Contraseña actualizada' });
});

export default router;
