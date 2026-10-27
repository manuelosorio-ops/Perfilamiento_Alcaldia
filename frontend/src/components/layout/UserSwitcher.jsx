import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Users } from 'lucide-react'
import { iniciales } from '../../api/client'

const COLORES = ['bg-alcaldia-600', 'bg-institucional-600', 'bg-amber-600', 'bg-rose-600', 'bg-violet-600']

export function Avatar({ usuario, size = 'size-9 text-sm' }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-full font-bold text-white ${size} ${COLORES[(usuario.id - 1) % COLORES.length]}`}>
      {iniciales(usuario.nombre)}
    </span>
  )
}

const resumen = (u) => `${u.edad} años · Estrato ${u.estrato} · ${u.sisben_grupo ? `Sisbén ${u.sisben_grupo}` : 'Sin Sisbén'}`

/** Selector rápido de ciudadano de prueba (sustituye el login en el prototipo). */
export default function UserSwitcher({ usuarios, usuarioId, onChange }) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef(null)
  const activo = usuarios.find((u) => u.id === usuarioId)

  useEffect(() => {
    const cerrar = (e) => {
      if (e.type === 'keydown' ? e.key === 'Escape' : !ref.current?.contains(e.target)) setAbierto(false)
    }
    document.addEventListener('mousedown', cerrar)
    document.addEventListener('keydown', cerrar)
    return () => {
      document.removeEventListener('mousedown', cerrar)
      document.removeEventListener('keydown', cerrar)
    }
  }, [])

  if (!activo) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        className="flex items-center gap-3 rounded-xl bg-white/10 py-1.5 pr-3 pl-1.5 text-left ring-1 ring-white/25 transition hover:bg-white/20"
      >
        <Avatar usuario={activo} />
        <span className="hidden min-w-0 sm:block">
          <span className="block text-[11px] font-medium tracking-wide text-alcaldia-100 uppercase">Ciudadano activo</span>
          <span className="block truncate text-sm font-semibold text-white">{activo.nombre}</span>
        </span>
        <ChevronDown className={`size-4 text-white transition ${abierto ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {abierto && (
        <div className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <p className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <Users className="size-4" aria-hidden="true" /> Usuarios de prueba
          </p>
          <ul role="listbox" aria-label="Seleccionar ciudadano">
            {usuarios.map((u) => (
              <li key={u.id}>
                <button
                  role="option"
                  aria-selected={u.id === usuarioId}
                  onClick={() => {
                    onChange(u.id)
                    setAbierto(false)
                  }}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-slate-50 ${u.id === usuarioId ? 'bg-alcaldia-50' : ''}`}
                >
                  <Avatar usuario={u} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">{u.nombre}</span>
                    <span className="block truncate text-xs text-slate-500">{resumen(u)}</span>
                  </span>
                  {u.id === usuarioId && <Check className="size-4 text-alcaldia-600" aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
