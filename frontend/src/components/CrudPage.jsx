import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'
import { entidades } from '../config/entidades.js'
import Icono from './Icono.jsx'

// Un solo componente resuelve el CRUD de cualquier catálogo descrito en entidades.js
export default function CrudPage({ entidad }) {
  const cfg = entidades[entidad]
  const [filas, setFilas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [opciones, setOpciones] = useState({})
  const [modal, setModal] = useState(null) // { modo: 'crear' | 'editar', fila? }

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      setFilas(await api(cfg.endpoint))
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }, [cfg.endpoint])

  // Opciones de los <select> que dependen de otros catálogos
  const cargarOpciones = useCallback(async () => {
    const dependientes = cfg.campos.filter((c) => c.opcionesDe)
    const resultado = {}
    await Promise.all(dependientes.map(async (c) => {
      const datos = await api(c.opcionesDe.endpoint)
      resultado[c.nombre] = datos.map((d) => ({ valor: d.id, texto: c.opcionesDe.texto(d) }))
    }))
    setOpciones(resultado)
  }, [cfg.campos])

  useEffect(() => {
    cargar()
  }, [cargar])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(''), 3500)
    return () => clearTimeout(t)
  }, [aviso])

  const textoCelda = (col, f) => {
    if (col.chip) return col.chip(f[col.campo])?.texto
    return col.formato ? col.formato(f[col.campo], f) : f[col.campo]
  }

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return filas
    return filas.filter((f) =>
      cfg.columnas.some((col) => String(textoCelda(col, f) ?? '').toLowerCase().includes(q)),
    )
  }, [filas, busqueda, cfg.columnas])

  const abrir = async (modo, fila) => {
    setError('')
    try {
      await cargarOpciones()
      setModal({ modo, fila })
    } catch (e) {
      setError(e.message)
    }
  }

  const eliminar = async (fila) => {
    const nombre = fila.nombre ?? fila.clave ?? `#${fila.id}`
    if (!window.confirm(`¿Eliminar ${cfg.articulo} ${cfg.singular} "${nombre}"? Esta acción no se puede deshacer.`)) return
    try {
      await api(`${cfg.endpoint}/${fila.id}`, { metodo: 'DELETE' })
      setAviso(`Se eliminó ${cfg.articulo} ${cfg.singular} "${nombre}"`)
      cargar()
    } catch (e) {
      setError(e.message)
    }
  }

  const guardado = (modo) => {
    setModal(null)
    setAviso(modo === 'crear' ? `Registro creado correctamente` : `Cambios guardados correctamente`)
    cargar()
  }

  return (
    <>
      {/* Encabezado: un solo bloque de color por pantalla */}
      <section className={`block block-${cfg.color} encabezado`}>
        <div className="eyebrow">Catálogo · {cargando ? '…' : `${filas.length} registro${filas.length === 1 ? '' : 's'}`}</div>
        <div className="encabezado-fila">
          <div style={{ display: 'grid', gap: 6 }}>
            <h1 className="display-lg">{cfg.titulo}</h1>
            <p className="subhead">{cfg.descripcion}</p>
          </div>
          <button className="btn btn-primary" onClick={() => abrir('crear')}>
            <Icono nombre="mas" /> {cfg.articulo === 'la' ? 'Nueva' : 'Nuevo'} {cfg.singular}
          </button>
        </div>
      </section>

      <section style={{ display: 'grid', gap: 16 }}>
        <div className="barra">
          <label className="search">
            <Icono nombre="buscar" />
            <span className="sr-only">Buscar {cfg.titulo.toLowerCase()}</span>
            <input
              type="search"
              className="input"
              placeholder={`Buscar ${cfg.titulo.toLowerCase()}…`}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </label>
          {busqueda && (
            <span className="caption">{filtradas.length} de {filas.length}</span>
          )}
        </div>

        <div aria-live="polite">
          {aviso && <div className="alert alert-success"><span>{aviso}</span></div>}
          {error && !modal && (
            <div className="alert alert-error" role="alert">
              <span>{error}</span>
              <button className="icon-btn" aria-label="Cerrar aviso" onClick={() => setError('')}>
                <Icono nombre="cerrar" tamano={16} />
              </button>
            </div>
          )}
        </div>

        <div className="tabla-marco">
          <div className="tabla-scroll">
            <table className="tabla">
              <thead>
                <tr>
                  {cfg.columnas.map((c) => <th key={c.campo} scope="col">{c.etiqueta}</th>)}
                  <th scope="col" className="acciones">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr><td colSpan={cfg.columnas.length + 1} className="vacio">
                    <div style={{ display: 'inline-flex', gap: 12, alignItems: 'center' }}>
                      <div className="spinner" /> <span className="caption">Cargando</span>
                    </div>
                  </td></tr>
                ) : filtradas.length === 0 ? (
                  <tr><td colSpan={cfg.columnas.length + 1} className="vacio">
                    <div className="card-title">{busqueda ? 'Sin coincidencias' : 'Aún no hay registros'}</div>
                    <p className="body-sm">
                      {busqueda ? 'Prueba con otro término de búsqueda.' : `Registra ${cfg.articulo === 'la' ? 'la primera' : 'el primer'} ${cfg.singular} con el botón “Nuevo”.`}
                    </p>
                  </td></tr>
                ) : filtradas.map((f) => (
                  <tr key={f.id}>
                    {cfg.columnas.map((c) => (
                      <td key={c.campo} className={c.principal ? 'principal' : c.mono ? 'mono' : undefined}>
                        <Celda columna={c} fila={f} />
                      </td>
                    ))}
                    <td className="acciones">
                      {cfg.protegido?.(f) ? (
                        <span className="chip"><Icono nombre="candado" tamano={14} /> Protegido</span>
                      ) : (
                        <>
                          <button className="icon-btn" title="Editar" aria-label={`Editar ${f.nombre ?? f.clave}`}
                            onClick={() => abrir('editar', f)}>
                            <Icono nombre="editar" tamano={18} />
                          </button>
                          <button className="icon-btn icon-btn-danger" title="Eliminar" aria-label={`Eliminar ${f.nombre ?? f.clave}`}
                            onClick={() => eliminar(f)}>
                            <Icono nombre="borrar" tamano={18} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {modal && (
        <Formulario
          cfg={cfg}
          modo={modal.modo}
          fila={modal.fila}
          opciones={opciones}
          onCerrar={() => setModal(null)}
          onGuardado={() => guardado(modal.modo)}
        />
      )}
    </>
  )
}

function Celda({ columna: c, fila }) {
  if (c.chip) {
    const chip = c.chip(fila[c.campo])
    return chip ? <span className={`chip chip-${chip.color}`}>{chip.texto}</span> : '—'
  }
  const valor = c.formato ? c.formato(fila[c.campo], fila) : fila[c.campo]
  return valor ?? '—'
}

function valoresIniciales(campos, fila) {
  const v = {}
  for (const c of campos) {
    if (c.tipo === 'checkbox') v[c.nombre] = fila ? Boolean(fila[c.nombre]) : true
    else if (c.tipo === 'password') v[c.nombre] = ''
    else v[c.nombre] = fila?.[c.nombre] ?? ''
  }
  return v
}

function Formulario({ cfg, modo, fila, opciones, onCerrar, onGuardado }) {
  const editando = modo === 'editar'
  const campos = cfg.campos.filter((c) => (editando ? !c.soloAlCrear : !c.soloAlEditar))
  const [valores, setValores] = useState(() => valoresIniciales(campos, fila))
  const [error, setError] = useState('')
  const [invalidos, setInvalidos] = useState([])
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', esc)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', esc)
      document.body.style.overflow = ''
    }
  }, [onCerrar])

  const cambiar = (c) => (e) =>
    setValores((v) => ({ ...v, [c.nombre]: c.tipo === 'checkbox' ? e.target.checked : e.target.value }))

  const enviar = async (e) => {
    e.preventDefault()
    setError('')
    setInvalidos([])
    setEnviando(true)
    const cuerpo = { ...valores }
    // En edición, una contraseña vacía significa "no cambiarla"
    for (const c of campos) if (c.tipo === 'password' && editando && !cuerpo[c.nombre]) delete cuerpo[c.nombre]
    try {
      await api(editando ? `${cfg.endpoint}/${fila.id}` : cfg.endpoint, {
        metodo: editando ? 'PUT' : 'POST',
        cuerpo,
      })
      onGuardado()
    } catch (err) {
      setError(err.message)
      setInvalidos(err.detalles?.map((d) => d.campo) ?? [])
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <form className="modal" onSubmit={enviar} role="dialog" aria-modal="true" aria-labelledby="titulo-modal">
        <div className="modal-cabecera">
          <div style={{ display: 'grid', gap: 8 }}>
            <span className="eyebrow">{cfg.titulo}</span>
            <h2 className="headline" id="titulo-modal">
              {editando ? `Editar ${cfg.singular}` : `${cfg.articulo === 'la' ? 'Nueva' : 'Nuevo'} ${cfg.singular}`}
            </h2>
          </div>
          <button type="button" className="icon-btn" aria-label="Cerrar" onClick={onCerrar}>
            <Icono nombre="cerrar" />
          </button>
        </div>
        <div className="modal-cuerpo">
          {error && <div className="alert alert-error" role="alert"><span>{error}</span></div>}
          {campos.map((c) => (
            <Campo
              key={c.nombre}
              campo={c}
              valor={valores[c.nombre]}
              onChange={cambiar(c)}
              opciones={c.opciones ?? opciones[c.nombre] ?? []}
              editando={editando}
              invalido={invalidos.includes(c.nombre)}
            />
          ))}
        </div>
        <div className="modal-pie">
          <button type="button" className="btn btn-soft" onClick={onCerrar}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={enviando}>
            {enviando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Campo({ campo: c, valor, onChange, opciones, editando, invalido }) {
  const id = `campo-${c.nombre}`
  const requerido = c.requerido && !(editando && c.opcionalAlEditar)
  const ayuda = editando && c.ayudaEditar ? c.ayudaEditar : c.ayuda

  if (c.tipo === 'checkbox') {
    return (
      <div className="field">
        <label className="switch" htmlFor={id}>
          <input id={id} type="checkbox" checked={valor} onChange={onChange} />
          <span className="pista" aria-hidden="true" />
          {c.etiqueta}
        </label>
      </div>
    )
  }

  return (
    <div className="field">
      <label htmlFor={id} className="label">
        {c.etiqueta}
        {requerido && <span className="req" aria-hidden="true">*</span>}
      </label>
      {c.tipo === 'select' ? (
        <select id={id} className="select" value={valor} onChange={onChange} required={requerido} aria-invalid={invalido}>
          <option value="">{requerido ? 'Selecciona…' : '— Sin asignar —'}</option>
          {opciones.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
        </select>
      ) : (
        <input
          id={id}
          type={c.tipo ?? 'text'}
          className="input"
          value={valor}
          onChange={onChange}
          required={requerido}
          min={c.min}
          max={c.max}
          autoComplete={c.autoComplete}
          aria-invalid={invalido}
        />
      )}
      {ayuda && <div className="help">{ayuda}</div>}
    </div>
  )
}
