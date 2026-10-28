import Icon from '../ui/Icon'

/** "Tipo de usuario": segmentos calculados por el backend (perfilamiento.json). */
export default function SegmentChips({ segmentos = [], etiqueta = 'Su perfil', className = '' }) {
  if (segmentos.length === 0) return null
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <span className="text-xs font-semibold text-slate-500">{etiqueta}:</span>
      {segmentos.map((s) => (
        <span
          key={s.id}
          title={s.descripcion}
          className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 ring-inset"
        >
          <Icon name={s.icono} className="size-3.5 text-alcaldia-600" />
          {s.nombre}
        </span>
      ))}
    </div>
  )
}
