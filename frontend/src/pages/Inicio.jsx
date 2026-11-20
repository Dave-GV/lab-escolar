import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { entidades } from '../config/entidades.js'
import Icono from '../components/Icono.jsx'

const TARJETAS = ['alumnos', 'maestros', 'materias', 'grupos', 'usuarios']

export default function Inicio() {
  const { usuario, esAdmin } = useAuth()
  const [resumen, setResumen] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/resumen').then(setResumen).catch((e) => setError(e.message))
  }, [])

  const nombre = usuario.nombre.split(' ')[0]
  const fecha = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <>
      <section className="block block-lime encabezado">
        <div className="eyebrow">{fecha}</div>
        <h1 className="display-xl">Hola, {nombre}.</h1>
        <p className="subhead">
          Entraste como <strong>{esAdmin ? 'administrador' : 'usuario'}</strong>.
          {esAdmin
            ? ' Puedes gestionar los catálogos y las cuentas del sistema.'
            : ' Puedes consultar y actualizar los catálogos escolares.'}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Link to="/alumnos" className="btn btn-primary">Ver alumnos <Icono nombre="flecha" /></Link>
          <Link to="/perfil" className="btn btn-secondary">Mi perfil</Link>
        </div>
      </section>

      <section style={{ display: 'grid', gap: 16 }}>
        <div className="eyebrow">Resumen del sistema</div>
        {error && <div className="alert alert-error" role="alert"><span>{error}</span></div>}
        <div className="rejilla-stats">
          {TARJETAS.filter((t) => t !== 'usuarios' || esAdmin).map((clave) => {
            const e = entidades[clave]
            return (
              <Link to={`/${clave}`} className="stat" key={clave}>
                <div className="caption" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="swatch" style={{ background: `var(--block-${e.color})` }} />
                  {e.titulo}
                </div>
                <div className="numero">{resumen ? resumen[clave] : '—'}</div>
                <div className="pie body-sm">
                  <span>Abrir catálogo</span>
                  <Icono nombre="flecha" />
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </>
  )
}
