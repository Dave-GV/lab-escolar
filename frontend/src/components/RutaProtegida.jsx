import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// Sin sesión → login. Usuario normal en página de admin → inicio.
// (La API también lo valida: esto solo es para la experiencia de usuario.)
export default function RutaProtegida({ soloAdmin = false, children }) {
  const { usuario, cargando, esAdmin } = useAuth()
  const ubicacion = useLocation()

  if (cargando) {
    return (
      <div className="cargando-pantalla" role="status">
        <div className="spinner" />
        <span className="sr-only">Cargando…</span>
      </div>
    )
  }

  if (!usuario) return <Navigate to="/login" replace state={{ desde: ubicacion }} />
  if (soloAdmin && !esAdmin) return <Navigate to="/" replace />

  return children ?? <Outlet />
}
