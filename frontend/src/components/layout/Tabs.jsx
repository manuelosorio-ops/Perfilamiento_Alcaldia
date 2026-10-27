import { IdCard, LayoutGrid } from 'lucide-react'

const TABS = [
  { id: 'ficha', etiqueta: 'Ficha del ciudadano', icono: IdCard },
  { id: 'tramites', etiqueta: 'Trámites y servicios', icono: LayoutGrid },
]

export default function Tabs({ vista, onCambiar, aptos, total }) {
  return (
    <nav className="border-b border-slate-200 bg-white" aria-label="Secciones">
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6">
        {TABS.map(({ id, etiqueta, icono: Icono }) => {
          const activo = vista === id
          return (
            <button
              key={id}
              onClick={() => onCambiar(id)}
              aria-current={activo ? 'page' : undefined}
              className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3.5 text-sm font-semibold transition ${
                activo ? 'border-alcaldia-600 text-alcaldia-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icono className="size-4" aria-hidden="true" />
              {etiqueta}
              {id === 'tramites' && total > 0 && (
                <span className="rounded-full bg-alcaldia-100 px-2 py-0.5 text-xs text-alcaldia-800">
                  {aptos}/{total}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
