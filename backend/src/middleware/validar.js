import { HttpError } from './errores.js';

// Valida req.body con un esquema Zod. Zod descarta las llaves que no
// están en el esquema, así que funciona como lista blanca de campos.
export const validar = (esquema) => (req, res, next) => {
  const resultado = esquema.safeParse(req.body ?? {});
  if (!resultado.success) {
    return res.status(400).json({
      error: 'Datos inválidos',
      detalles: resultado.error.issues.map((i) => ({
        campo: i.path.join('.'),
        mensaje: i.message,
      })),
    });
  }
  req.body = resultado.data;
  next();
};

// Valida que :id sea un entero positivo
export function validarId(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return next(new HttpError(400, 'Identificador inválido'));
  }
  req.id = id;
  next();
}
