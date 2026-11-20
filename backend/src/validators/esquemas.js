import { z } from 'zod';

// '' (campo vacío del formulario) se guarda como NULL
const vacioANull = (v) => (typeof v === 'string' && v.trim() === '' ? null : v);
const opcional = (esquema) => z.preprocess(vacioANull, esquema.nullable().optional());

const texto = (max, nombre) =>
  z.string({ error: `${nombre} es obligatorio` })
    .trim()
    .min(1, `${nombre} es obligatorio`)
    .max(max, `${nombre}: máximo ${max} caracteres`);

const email = z.string().trim().toLowerCase().email('Correo no válido').max(120);
const idForaneo = z.coerce.number().int().positive('Selecciona una opción válida');

// Política de contraseñas para cuentas nuevas y cambios de contraseña
export const password = z
  .string({ error: 'La contraseña es obligatoria' })
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(72, 'La contraseña no debe pasar de 72 caracteres') // límite de bcrypt
  .regex(/[a-z]/, 'La contraseña debe incluir una minúscula')
  .regex(/[A-Z]/, 'La contraseña debe incluir una mayúscula')
  .regex(/\d/, 'La contraseña debe incluir un número')
  .regex(/[^A-Za-z0-9]/, 'La contraseña debe incluir un símbolo');

// ---------- Autenticación ----------
export const login = z.object({
  username: z.string().trim().min(1, 'Usuario obligatorio').max(50),
  password: z.string().min(1, 'Contraseña obligatoria').max(128),
});

export const cambioPassword = z.object({
  actual: z.string().min(1, 'Escribe tu contraseña actual').max(128),
  nueva: password,
});

// ---------- Usuarios (solo admin) ----------
// No existe el campo "rol": aunque el cliente lo envíe, Zod lo descarta.
const username = z
  .string()
  .trim()
  .min(3, 'El usuario debe tener al menos 3 caracteres')
  .max(50)
  .regex(/^[A-Za-z0-9._-]+$/, 'El usuario solo admite letras, números, punto, guion y guion bajo');

export const usuarioNuevo = z.object({
  nombre: texto(100, 'Nombre'),
  username,
  email: opcional(email),
  password,
});

export const usuarioEdicion = z.object({
  nombre: texto(100, 'Nombre'),
  username,
  email: opcional(email),
  password: opcional(password), // vacío = no cambiar
  activo: z.boolean().optional(),
});

// ---------- Catálogos ----------
export const maestro = z.object({
  nombre: texto(80, 'Nombre'),
  apellidos: texto(100, 'Apellidos'),
  email,
  telefono: opcional(z.string().trim().regex(/^[0-9 +()-]{7,20}$/, 'Teléfono no válido')),
  especialidad: opcional(z.string().trim().max(100)),
});

export const materia = z.object({
  clave: texto(20, 'Clave').transform((s) => s.toUpperCase()),
  nombre: texto(100, 'Nombre'),
  creditos: z.coerce.number().int().min(1, 'Mínimo 1 crédito').max(20, 'Máximo 20 créditos'),
  maestro_id: opcional(idForaneo),
});

export const grupo = z.object({
  nombre: texto(20, 'Nombre'),
  grado: z.coerce.number().int().min(1, 'Grado entre 1 y 12').max(12, 'Grado entre 1 y 12'),
  turno: z.enum(['Matutino', 'Vespertino'], { error: 'Turno no válido' }),
  ciclo: texto(20, 'Ciclo'),
});

export const alumno = z.object({
  matricula: texto(20, 'Matrícula').transform((s) => s.toUpperCase()),
  nombre: texto(80, 'Nombre'),
  apellidos: texto(100, 'Apellidos'),
  email: opcional(email),
  fecha_nacimiento: opcional(
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha no válida (AAAA-MM-DD)'),
  ),
  grupo_id: opcional(idForaneo),
  materia_id: opcional(idForaneo),
});
