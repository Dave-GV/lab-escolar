import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HttpError } from './errores.js';

export const DIR_UPLOADS = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../uploads',
);

const TIPOS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// 1) Filtro por tipo declarado y 2) límite de tamaño.
// El archivo se queda en memoria hasta comprobar su contenido real.
export const subirFoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!TIPOS[file.mimetype]) {
      return cb(new HttpError(400, 'Solo se permiten imágenes JPG, PNG o WEBP'));
    }
    cb(null, true);
  },
}).single('foto');

// 3) Magic bytes: los primeros bytes revelan el tipo real del archivo,
// sin importar la extensión ni el Content-Type que diga el cliente.
function tipoReal(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (
    buf.length >= 8 &&
    buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) return 'png';
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) return 'webp';
  return null;
}

// 4) Nombre aleatorio: el cliente nunca decide el nombre ni la ruta.
export async function guardarFoto(file) {
  if (!file) throw new HttpError(400, 'Selecciona una imagen (campo "foto")');
  const ext = tipoReal(file.buffer);
  if (!ext) throw new HttpError(400, 'El archivo no es una imagen válida');
  const nombre = `${crypto.randomUUID()}.${ext}`;
  await fs.writeFile(path.join(DIR_UPLOADS, nombre), file.buffer, { flag: 'wx' });
  return nombre;
}

export async function borrarFoto(nombre) {
  if (!nombre) return;
  // basename evita salir de la carpeta uploads (path traversal)
  await fs.unlink(path.join(DIR_UPLOADS, path.basename(nombre))).catch(() => {});
}
