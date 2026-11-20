import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Avatar from '../components/Avatar.jsx'
import Icono from '../components/Icono.jsx'

const MENU = [
  { a: '/', texto: 'Inicio', icono: 'inicio', fin: true },
  { a: '/alumnos', texto: 'Alumnos', icono: 'alumnos' },
  { a: '/maestros', texto: 'Maestros', icono: 'maestros' },
  { a: '/materias', texto: 'Materias', icono: 'materias' },
  { a: '/grupos', texto: 'Grupos', icono: 'grupos' },
  { a: '/usuarios', texto: 'Usuarios', icono: 'usuarios', soloAdmin: true },
  { a: '/perfil', texto: 'Mi perfil', icono: 'perfil' },
]

export default function DashboardLayout() {
  const { usuario, esAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [abierto, setAbierto] = useState(false)

  const actual = MENU.find((m) => (m.fin ? pathname === m.a : pathname.startsWith(m.a)))

  const salir = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app">
      <aside className={`sidebar ${abierto ? 'abierto' : ''}`} aria-label="Menú principal">
        <div className="marca">
          <Link to="/" className="marca-texto" onClick={() => setAbierto(false)}>
            Sistema <span>Escolar</span>
          </Link>
          <button className="icon-btn menu-cerrar" onClick={() => setAbierto(false)} aria-label="Cerrar menú">
            <Icono nombre="cerrar" />
          </button>
        </div>

        {/* Foto, datos y rol del usuario */}
        <div className="tile perfil-mini">
          <div className="fila">
            <Avatar usuario={usuario} tamano={52} />
            <div className="datos">
              <div className="nombre">{usuario.nombre}</div>
              <div className="detalle">@{usuario.username}</div>
            </div>
          </div>
          {usuario.email && <div className="detalle">{usuario.email}</div>}
          <div>
            <span className={`chip ${esAdmin ? 'chip-ink' : 'chip-lilac'}`}>
              {esAdmin ? 'Administrador' : 'Usuario'}
            </span>
          </div>
        </div>

        <nav className="nav">
          <div className="caption nav-titulo">Navegación</div>
          {MENU.filter((m) => !m.soloAdmin || esAdmin).map((m) => (
            <NavLink
              key={m.a}
              to={m.a}
              end={m.fin}
              onClick={() => setAbierto(false)}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icono nombre={m.icono} />
              {m.texto}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-pie">
          <button className="btn btn-outline btn-block" onClick={salir}>
            <Icono nombre="salir" /> Cerrar sesión
          </button>
        </div>
      </aside>

      {abierto && <div className="sidebar-fondo" onClick={() => setAbierto(false)} />}

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setAbierto(true)} aria-label="Abrir menú">
            <Icono nombre="menu" />
          </button>
          <div className="ruta caption">
            <span>Sistema escolar</span>
            <span aria-hidden="true">/</span>
            <span className="strong">{actual?.texto ?? 'Inicio'}</span>
          </div>
        </header>
        <main className="pagina">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
