// Cada catálogo se describe aquí: campos del formulario y columnas de la tabla.
// CrudPage usa esta descripción para resolver los cinco CRUD con un solo componente.
//
// Entidad: { titulo, singular, endpoint, color (bloque de la paleta), descripcion, campos, columnas, protegido? }
// Campo:   { nombre, etiqueta, tipo, requerido, opciones | opcionesDe, ayuda, soloAlEditar, opcionalAlEditar }
// Columna: { campo, etiqueta, formato?, chip?, principal?, mono? }

const fecha = (v) =>
  v ? new Date(`${v}T00:00:00`).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : null

export const entidades = {
  alumnos: {
    titulo: 'Alumnos',
    singular: 'alumno',
    articulo: 'el',
    endpoint: '/alumnos',
    color: 'lime',
    descripcion: 'Matrícula, datos de contacto, grupo y materia de cada estudiante.',
    campos: [
      { nombre: 'matricula', etiqueta: 'Matrícula', requerido: true },
      { nombre: 'nombre', etiqueta: 'Nombre', requerido: true },
      { nombre: 'apellidos', etiqueta: 'Apellidos', requerido: true },
      { nombre: 'email', etiqueta: 'Correo', tipo: 'email' },
      { nombre: 'fecha_nacimiento', etiqueta: 'Fecha de nacimiento', tipo: 'date' },
      {
        nombre: 'grupo_id', etiqueta: 'Grupo', tipo: 'select',
        opcionesDe: { endpoint: '/grupos', texto: (g) => `${g.nombre} · ${g.turno} (${g.ciclo})` },
      },
      {
        nombre: 'materia_id', etiqueta: 'Materia', tipo: 'select',
        opcionesDe: { endpoint: '/materias', texto: (m) => `${m.clave} · ${m.nombre}` },
      },
    ],
    columnas: [
      { campo: 'matricula', etiqueta: 'Matrícula', mono: true },
      { campo: 'nombre', etiqueta: 'Nombre', principal: true, formato: (_, f) => `${f.nombre} ${f.apellidos}` },
      { campo: 'email', etiqueta: 'Correo' },
      { campo: 'fecha_nacimiento', etiqueta: 'Nacimiento', formato: fecha },
      { campo: 'grupo', etiqueta: 'Grupo', chip: (v) => v && { texto: v, color: 'cream' } },
      { campo: 'materia', etiqueta: 'Materia' },
    ],
  },

  maestros: {
    titulo: 'Maestros',
    singular: 'maestro',
    articulo: 'el',
    endpoint: '/maestros',
    color: 'lilac',
    descripcion: 'El equipo docente y su especialidad. Un maestro con materias asignadas no se puede eliminar.',
    campos: [
      { nombre: 'nombre', etiqueta: 'Nombre', requerido: true },
      { nombre: 'apellidos', etiqueta: 'Apellidos', requerido: true },
      { nombre: 'email', etiqueta: 'Correo', tipo: 'email', requerido: true },
      { nombre: 'telefono', etiqueta: 'Teléfono', tipo: 'tel' },
      { nombre: 'especialidad', etiqueta: 'Especialidad' },
    ],
    columnas: [
      { campo: 'nombre', etiqueta: 'Nombre', principal: true, formato: (_, f) => `${f.nombre} ${f.apellidos}` },
      { campo: 'email', etiqueta: 'Correo' },
      { campo: 'telefono', etiqueta: 'Teléfono', mono: true },
      { campo: 'especialidad', etiqueta: 'Especialidad', chip: (v) => v && { texto: v, color: 'lilac' } },
    ],
  },

  materias: {
    titulo: 'Materias',
    singular: 'materia',
    articulo: 'la',
    endpoint: '/materias',
    color: 'cream',
    descripcion: 'El plan de estudios: clave, créditos y el maestro que imparte cada materia.',
    campos: [
      { nombre: 'clave', etiqueta: 'Clave', requerido: true },
      { nombre: 'nombre', etiqueta: 'Nombre', requerido: true },
      { nombre: 'creditos', etiqueta: 'Créditos', tipo: 'number', requerido: true, min: 1, max: 20 },
      {
        nombre: 'maestro_id', etiqueta: 'Maestro', tipo: 'select',
        opcionesDe: { endpoint: '/maestros', texto: (m) => `${m.nombre} ${m.apellidos}` },
      },
    ],
    columnas: [
      { campo: 'clave', etiqueta: 'Clave', mono: true },
      { campo: 'nombre', etiqueta: 'Nombre', principal: true },
      { campo: 'creditos', etiqueta: 'Créditos', mono: true },
      { campo: 'maestro', etiqueta: 'Maestro' },
    ],
  },

  grupos: {
    titulo: 'Grupos',
    singular: 'grupo',
    articulo: 'el',
    endpoint: '/grupos',
    color: 'mint',
    descripcion: 'Grupos por grado, turno y ciclo escolar.',
    campos: [
      { nombre: 'nombre', etiqueta: 'Nombre', requerido: true, ayuda: 'Ejemplo: 2B' },
      { nombre: 'grado', etiqueta: 'Grado', tipo: 'number', requerido: true, min: 1, max: 12 },
      {
        nombre: 'turno', etiqueta: 'Turno', tipo: 'select', requerido: true,
        opciones: [
          { valor: 'Matutino', texto: 'Matutino' },
          { valor: 'Vespertino', texto: 'Vespertino' },
        ],
      },
      { nombre: 'ciclo', etiqueta: 'Ciclo escolar', requerido: true, ayuda: 'Ejemplo: 2026-2027' },
    ],
    columnas: [
      { campo: 'nombre', etiqueta: 'Grupo', principal: true },
      { campo: 'grado', etiqueta: 'Grado', formato: (v) => `${v}°` },
      {
        campo: 'turno', etiqueta: 'Turno',
        chip: (v) => ({ texto: v, color: v === 'Matutino' ? 'lime' : 'lilac' }),
      },
      { campo: 'ciclo', etiqueta: 'Ciclo', mono: true },
    ],
  },

  usuarios: {
    titulo: 'Usuarios',
    singular: 'usuario',
    articulo: 'el',
    endpoint: '/usuarios',
    color: 'coral',
    descripcion: 'Cuentas con acceso al sistema. Las nuevas siempre tienen rol de usuario; los dos administradores están protegidos.',
    // Admin y Root no se editan ni se borran
    protegido: (fila) => fila.rol === 'admin',
    campos: [
      { nombre: 'nombre', etiqueta: 'Nombre completo', requerido: true },
      { nombre: 'username', etiqueta: 'Usuario', requerido: true, autoComplete: 'off' },
      { nombre: 'email', etiqueta: 'Correo', tipo: 'email' },
      {
        nombre: 'password', etiqueta: 'Contraseña', tipo: 'password', requerido: true,
        opcionalAlEditar: true, autoComplete: 'new-password',
        ayuda: 'Mínimo 8 caracteres con mayúscula, minúscula, número y símbolo.',
        ayudaEditar: 'Déjala vacía para no cambiarla.',
      },
      { nombre: 'activo', etiqueta: 'Cuenta activa', tipo: 'checkbox', soloAlEditar: true },
    ],
    columnas: [
      { campo: 'nombre', etiqueta: 'Nombre', principal: true },
      { campo: 'username', etiqueta: 'Usuario', mono: true, formato: (v) => `@${v}` },
      { campo: 'email', etiqueta: 'Correo' },
      {
        campo: 'rol', etiqueta: 'Rol',
        chip: (v) => (v === 'admin' ? { texto: 'Administrador', color: 'ink' } : { texto: 'Usuario', color: 'lilac' }),
      },
      {
        campo: 'activo', etiqueta: 'Estado',
        chip: (v) => (v ? { texto: 'Activo', color: 'mint' } : { texto: 'Inactivo', color: 'pink' }),
      },
    ],
  },
}
