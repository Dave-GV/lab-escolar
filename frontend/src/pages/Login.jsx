import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
  const { usuario, login } = useAuth()
  const navigate = useNavigate()
  const ubicacion = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (usuario) return <Navigate to="/" replace />

  const enviar = async (e) => {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      await login(username.trim(), password)
      navigate(ubicacion.state?.desde?.pathname ?? '/', { replace: true })
    } catch (err) {
      setError(err.message)
      setPassword('')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="login">
      {/* Bloque de color con la historia del producto */}
      <section className="block block-lilac login-bloque">
        <div className="eyebrow">Sistema escolar · Node.js + React + MariaDB</div>
        <div style={{ display: 'grid', gap: 24 }}>
          <h1 className="display-xl">Toda tu escuela, en un solo lugar.</h1>
          <p className="subhead" style={{ maxWidth: '30ch' }}>
            Alumnos, maestros, materias y grupos, con acceso seguro por roles.
          </p>
        </div>
        <div className="notas" aria-hidden="true">
          <span className="nota">Alumnos</span>
          <span className="nota">Maestros</span>
          <span className="nota">Materias</span>
          <span className="nota">Grupos</span>
        </div>
      </section>

      <section className="login-form">
        <form onSubmit={enviar}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Acceso</div>
          <h2 className="display-lg" style={{ marginBottom: 12 }}>Inicia sesión</h2>
          <p className="body" style={{ marginBottom: 32 }}>Usa la cuenta que te asignó un administrador.</p>

          {error && <div className="alert alert-error" role="alert"><span>{error}</span></div>}

          <div className="field">
            <label htmlFor="username" className="label">Usuario</label>
            <input
              id="username"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password" className="label">Contraseña</label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <button className="btn btn-primary btn-block" disabled={enviando} style={{ marginTop: 8 }}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
          <p className="caption" style={{ marginTop: 24, lineHeight: 1.6 }}>
            5 intentos fallidos bloquean la cuenta 15 minutos
          </p>
        </form>
      </section>
    </div>
  )
}
