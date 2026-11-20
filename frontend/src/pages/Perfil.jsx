import { useRef, useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'
import Avatar from '../components/Avatar.jsx'

export default function Perfil() {
  const { usuario, esAdmin, setUsuario } = useAuth()

  return (
    <>
      {/* Bloque navy: la única superficie oscura de la app */}
      <section className="block block-navy encabezado">
        <div className="eyebrow">Mi perfil</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20 }}>
          <Avatar usuario={usuario} tamano={72} />
          <div style={{ display: 'grid', gap: 8, minWidth: 0 }}>
            <h1 className="display-lg">{usuario.nombre}</h1>
            <p className="subhead">
              @{usuario.username}{usuario.email ? ` · ${usuario.email}` : ''}
            </p>
            <div>
              <span className={`chip ${esAdmin ? 'chip-lime' : 'chip-lilac'}`}>
                {esAdmin ? 'Administrador' : 'Usuario'}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="rejilla-2">
        <SubirFoto onSubida={(foto) => setUsuario({ ...usuario, foto })} />
        <CambiarPassword />
      </div>
    </>
  )
}

function SubirFoto({ onSubida }) {
  const entrada = useRef(null)
  const [mensaje, setMensaje] = useState(null)
  const [subiendo, setSubiendo] = useState(false)

  const subir = async (e) => {
    e.preventDefault()
    const archivo = entrada.current.files[0]
    if (!archivo) return setMensaje({ tipo: 'error', texto: 'Selecciona una imagen' })
    const datos = new FormData()
    datos.append('foto', archivo)
    setSubiendo(true)
    try {
      const { foto } = await api('/auth/me/foto', { metodo: 'PUT', archivo: datos })
      onSubida(foto)
      setMensaje({ tipo: 'success', texto: 'Foto actualizada' })
      entrada.current.value = ''
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message })
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <form onSubmit={subir} className="card">
      <div className="eyebrow" style={{ marginBottom: 8 }}>Imagen</div>
      <h2 className="card-title" style={{ marginBottom: 24 }}>Foto de perfil</h2>
      <div className="field">
        <label htmlFor="foto" className="label">Archivo</label>
        <input id="foto" ref={entrada} type="file" accept="image/jpeg,image/png,image/webp" className="input" />
        <div className="help">JPG, PNG o WEBP de máximo 2 MB.</div>
      </div>
      {mensaje && <div className={`alert alert-${mensaje.tipo}`}><span>{mensaje.texto}</span></div>}
      <button className="btn btn-primary" disabled={subiendo}>
        {subiendo ? 'Subiendo…' : 'Subir foto'}
      </button>
    </form>
  )
}

function CambiarPassword() {
  const vacio = { actual: '', nueva: '', confirmar: '' }
  const [v, setV] = useState(vacio)
  const [mensaje, setMensaje] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const cambiar = (campo) => (e) => setV({ ...v, [campo]: e.target.value })

  const enviar = async (e) => {
    e.preventDefault()
    if (v.nueva !== v.confirmar) {
      return setMensaje({ tipo: 'error', texto: 'La confirmación no coincide con la nueva contraseña' })
    }
    setEnviando(true)
    try {
      await api('/auth/me/password', { metodo: 'PUT', cuerpo: { actual: v.actual, nueva: v.nueva } })
      setMensaje({ tipo: 'success', texto: 'Contraseña actualizada correctamente' })
      setV(vacio)
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="card">
      <div className="eyebrow" style={{ marginBottom: 8 }}>Seguridad</div>
      <h2 className="card-title" style={{ marginBottom: 24 }}>Cambiar contraseña</h2>
      <div className="field">
        <label htmlFor="actual" className="label">Contraseña actual</label>
        <input id="actual" type="password" className="input" value={v.actual}
          onChange={cambiar('actual')} autoComplete="current-password" required />
      </div>
      <div className="field">
        <label htmlFor="nueva" className="label">Nueva contraseña</label>
        <input id="nueva" type="password" className="input" value={v.nueva}
          onChange={cambiar('nueva')} autoComplete="new-password" required />
        <div className="help">Mínimo 8 caracteres con mayúscula, minúscula, número y símbolo.</div>
      </div>
      <div className="field">
        <label htmlFor="confirmar" className="label">Confirmar nueva contraseña</label>
        <input id="confirmar" type="password" className="input" value={v.confirmar}
          onChange={cambiar('confirmar')} autoComplete="new-password" required />
      </div>
      {mensaje && <div className={`alert alert-${mensaje.tipo}`}><span>{mensaje.texto}</span></div>}
      <button className="btn btn-primary" disabled={enviando}>
        {enviando ? 'Guardando…' : 'Actualizar contraseña'}
      </button>
    </form>
  )
}
