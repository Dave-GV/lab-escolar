// Cliente fetch para la API. La cookie httpOnly viaja sola (mismo origen).
export class ApiError extends Error {
  constructor(status, mensaje, detalles) {
    super(mensaje)
    this.status = status
    this.detalles = detalles
  }
}

// Se notifica cuando la sesión expira para que AuthContext reaccione
let alExpirarSesion = () => {}
export const onSesionExpirada = (fn) => { alExpirarSesion = fn }

export async function api(ruta, { metodo = 'GET', cuerpo, archivo } = {}) {
  const opciones = { method: metodo, credentials: 'same-origin', headers: {} }

  if (archivo) {
    opciones.body = archivo // FormData: el navegador pone el Content-Type
  } else if (cuerpo !== undefined) {
    opciones.headers['Content-Type'] = 'application/json'
    opciones.body = JSON.stringify(cuerpo)
  }

  let res
  try {
    res = await fetch(`/api${ruta}`, opciones)
  } catch {
    throw new ApiError(0, 'No hay conexión con el servidor')
  }

  if (res.status === 204) return null

  let datos = null
  try {
    datos = await res.json()
  } catch {
    if (!res.ok) throw new ApiError(res.status, 'No hay conexión con el servidor')
  }

  if (!res.ok) {
    if (res.status === 401 && ruta !== '/auth/login' && ruta !== '/auth/me') alExpirarSesion()
    const detalle = datos?.detalles?.map((d) => d.mensaje).join('. ')
    throw new ApiError(res.status, detalle || datos?.error || 'Error inesperado', datos?.detalles)
  }
  return datos
}
