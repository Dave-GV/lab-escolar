import multer from 'multer';

// Error con código HTTP y mensaje seguro para mostrar al cliente
export class HttpError extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

export function noEncontrado(req, res) {
  res.status(404).json({ error: 'Recurso no encontrado' });
}

// Manejador central: respuestas genéricas, nunca stack traces
// eslint-disable-next-line no-unused-vars
export function manejarErrores(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }

  if (err instanceof multer.MulterError) {
    const mensaje = err.code === 'LIMIT_FILE_SIZE'
      ? 'La imagen no debe pesar más de 2 MB'
      : 'Archivo no válido';
    return res.status(400).json({ error: mensaje });
  }

  // JSON mal formado o demasiado grande
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON mal formado' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Petición demasiado grande' });
  }

  // Errores de MariaDB traducidos a mensajes entendibles
  switch (err.code) {
    case 'ER_DUP_ENTRY':
      return res.status(409).json({ error: 'Ya existe un registro con ese valor único' });
    case 'ER_ROW_IS_REFERENCED':
    case 'ER_ROW_IS_REFERENCED_2':
      return res.status(409).json({ error: 'No se puede eliminar: tiene registros relacionados' });
    case 'ER_NO_REFERENCED_ROW':
    case 'ER_NO_REFERENCED_ROW_2':
      return res.status(400).json({ error: 'El registro relacionado no existe' });
    case 'ER_SIGNAL_EXCEPTION': // mensaje propio de un trigger (regla de negocio)
      return res.status(409).json({ error: err.sqlMessage });
    case 'ECONNREFUSED':
    case 'ER_ACCESS_DENIED_ERROR':
      console.error('❌ Base de datos no disponible:', err.code);
      return res.status(503).json({ error: 'Servicio no disponible' });
    default:
      break;
  }

  console.error(err); // solo en el servidor
  res.status(500).json({ error: 'Error interno del servidor' });
}
