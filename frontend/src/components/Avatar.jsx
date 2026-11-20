// Foto de perfil o iniciales sobre un color de la paleta de bloques.
// Marco cuadrado redondeado (rounded.md), sin círculos.
const COLORES = ['lime', 'lilac', 'cream', 'mint', 'pink', 'coral']

function colorDe(texto = '') {
  let h = 0
  for (const c of texto) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return COLORES[h % COLORES.length]
}

export default function Avatar({ usuario, tamano = 48 }) {
  const estilo = { width: tamano, height: tamano, fontSize: tamano * 0.36 }

  if (usuario?.foto) {
    return (
      <img
        src={`/uploads/${encodeURIComponent(usuario.foto)}`}
        alt={`Foto de ${usuario.nombre}`}
        className="avatar"
        style={estilo}
      />
    )
  }

  const iniciales = (usuario?.nombre ?? '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

  return (
    <div
      className="avatar"
      style={{ ...estilo, background: `var(--block-${colorDe(usuario?.username)})` }}
      aria-hidden="true"
    >
      {iniciales}
    </div>
  )
}
