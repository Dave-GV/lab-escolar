import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, onSesionExpirada } from '../api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)

  // Al iniciar, pregunta si ya hay sesión (la cookie la manda el navegador)
  const refrescar = useCallback(async () => {
    try {
      const { usuario } = await api('/auth/me')
      setUsuario(usuario)
    } catch {
      setUsuario(null)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    onSesionExpirada(() => setUsuario(null))
    refrescar()
  }, [refrescar])

  const login = async (username, password) => {
    const { usuario } = await api('/auth/login', { metodo: 'POST', cuerpo: { username, password } })
    setUsuario(usuario)
    return usuario
  }

  const logout = async () => {
    await api('/auth/logout', { metodo: 'POST' }).catch(() => {})
    setUsuario(null)
  }

  const valor = {
    usuario,
    cargando,
    esAdmin: usuario?.rol === 'admin',
    login,
    logout,
    refrescar,
    setUsuario,
  }

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
