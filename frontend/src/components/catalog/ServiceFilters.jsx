import { Search } from 'lucide-react'
import Icon from '../ui/Icon'

const ESTADOS = [
  { id: 'TODOS', etiqueta: 'Todos' },
  { id: 'APTO', etiqueta: 'Aptos' },
  { id: 'NO_APTO', etiqueta: 'No aptos' },
  { id: 'REQUIERE_REVISION', etiqueta: 'En revisión' },
]

export default function ServiceFilters({ categorias, filtros, onChange, conteos }) {
  const set = (cambios) => onChange({ ...filtros, ...cambios })
  const chip = (activo) =>
    `inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 transition ${
      activo ? 'bg-alcaldia-600 text-white ring-alcaldia-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
    }`

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="relative block md:w-80">
          <span className="sr-only">Buscar trámite</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={filtros.busqueda}
            onChange={(e) => set({ busqueda: e.target.value })}
            placeholder="Buscar trámite o entidad…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-3 pl-9 text-sm placeholder:text-slate-400 focus:border-alcaldia-500 focus:outline-none"
          />
        </label>
        <div className="inline-flex self-start rounded-xl bg-slate-100 p-1" role="group" aria-label="Filtrar por estado">
          {ESTADOS.filter((e) => e.id !== 'REQUIERE_REVISION' || conteos.REQUIERE_REVISION > 0).map((e) => (
            <button
              key={e.id}
              onClick={() => set({ estado: e.id })}
              aria-pressed={filtros.estado === e.id}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                filtros.estado === e.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {e.etiqueta} <span className="text-slate-400">{conteos[e.id]}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filtrar por categoría">
        <button className={chip(filtros.categoria === 'todas')} aria-pressed={filtros.categoria === 'todas'} onClick={() => set({ categoria: 'todas' })}>
          Todas las categorías
        </button>
        {categorias.map((c) => (
          <button key={c.id} className={chip(filtros.categoria === c.id)} aria-pressed={filtros.categoria === c.id} onClick={() => set({ categoria: c.id })}>
            <Icon name={c.icono} className="size-4" /> {c.nombre}
          </button>
        ))}
      </div>
    </div>
  )
}
