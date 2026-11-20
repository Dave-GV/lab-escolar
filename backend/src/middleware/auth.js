import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { HttpError } from './errores.js';

export const COOKIE = 'lab_token';
const DURACION_MS = 2 * 60 * 60 * 1000; // 2 horas

// httpOnly: JavaScript del navegador no puede leerla (protege contra XSS)
// sameSite strict: el navegador no la envía desde otros sitios (protege contra CSRF)
// secure: solo por HTTPS en producción
export const opcionesCookie = () => ({
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
});

export function emitirSesion(res, usuario) {
  const token = jwt.sign(
    { sub: String(usuario.id), rol: usuario.rol },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRA || '2h' },
  );
  res.cookie(COOKIE, token, { ...opcionesCookie(), maxAge: DURACION_MS });
}

export function cerrarSesion(res) {
  res.clearCookie(COOKIE, opcionesCookie());
}

// Campos públicos del usuario (nunca el hash)
export const CAMPOS_PUBLICOS = 'id, nombre, username, email, rol, foto, activo, creado_en';

// Requiere sesión válida. Además del JWT, consulta la BD en cada petición
// para que una cuenta desactivada o eliminada pierda el acceso de inmediato.
export async function requiereSesion(req, res, next) {
  const token = req.cookies?.[COOKIE];
  if (!token) return next(new HttpError(401, 'No autenticado'));

  let datos;
  try {
    datos = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    cerrarSesion(res);
    return next(new HttpError(401, 'Sesión inválida o expirada'));
  }

  const [filas] = await pool.query(
    `SELECT ${CAMPOS_PUBLICOS} FROM usuarios WHERE id = ?`,
    [Number(datos.sub)],
  );
  const usuario = filas[0];
  if (!usuario || !usuario.activo) {
    cerrarSesion(res);
    return next(new HttpError(401, 'Sesión inválida o expirada'));
  }

  req.usuario = usuario; // el rol se toma de la BD, no del token
  next();
}

export function soloAdmin(req, res, next) {
  if (req.usuario?.rol !== 'admin') {
    return next(new HttpError(403, 'Acceso solo para administradores'));
  }
  next();
}
