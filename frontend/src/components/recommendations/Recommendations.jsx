import { AlertTriangle, ArrowRight, History, Lightbulb, LockOpen, Play, Star } from 'lucide-react'
import Badge from '../ui/Badge'
import Icon from '../ui/Icon'
import SegmentChips from './SegmentChips'

/**
 * Bloque "Recomendados para usted" de la ficha. Los datos vienen ya calculados por
 * GET /api/usuarios/{id}/recomendaciones (priorizacion.py): aquí solo se presentan.
 */
export default function Recommendations({ datos, categorias = [], onIniciar, onIrA }) {
  if (!datos) return null
  const { segmentos, recomendados, desbloqueables, en_seguimiento: seguimiento } = datos
  const nombreCategoria = (id) => categorias.find((c) => c.id === id)?.nombre

  return (
    <section
      aria-labelledby="reco-titulo"
      className="rounded-2xl border border-alcaldia-200 bg-gradient-to-br from-alcaldia-50 via-white to-white p-5 shadow-sm sm:p-6 lg:col-span-3"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 id="reco-titulo" className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Star className="size-5 fill-alcaldia-500 text-alcaldia-600" aria-hidden="true" /> Recomendados para usted
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">Lo que le sugerimos hacer primero, según su perfil y su situación actual.</p>
        </div>
        <SegmentChips segmentos={segmentos} />
      </div>

      {recomendados.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
          Por ahora no tenemos sugerencias específicas para su perfil. Puede consultar todo el catálogo de trámites.
        </p>
      ) : (
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {recomendados.map((s, i) => (
            <li key={s.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-alcaldia-50 text-alcaldia-700">
                  <Icon name={s.icono} className="size-5" />
                </span>
                {s.prioridad.urgente ? (
                  <Badge tono="rojo" icon={AlertTriangle}>Prioritario</Badge>
                ) : (
                  <span className="text-xs font-bold text-slate-300" aria-label={`Sugerencia ${i + 1}`}>#{i + 1}</span>
                )}
              </div>
              <p className="mt-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">{nombreCategoria(s.categoria)}</p>
              <h3 className="mt-0.5 font-bold leading-snug text-slate-900">{s.nombre}</h3>
              {s.prioridad.razon_principal && (
                <p className="mt-2 flex items-start gap-1.5 text-sm text-slate-600">
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden="true" />
                  {s.prioridad.razon_principal}
                </p>
              )}
              <div className="mt-auto pt-4">
                <button
                  onClick={() => onIniciar(s)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-alcaldia-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-alcaldia-700"
                >
                  <Play className="size-4" aria-hidden="true" /> Iniciar trámite
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      {desbloqueables.length > 0 && (
        <div className="mt-5 border-t border-alcaldia-100 pt-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <LockOpen className="size-4 text-institucional-600" aria-hidden="true" /> Puede habilitar
          </h3>
          <ul className="mt-2 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {desbloqueables.map((s) => (
              <li key={s.id} className="rounded-xl bg-white p-3 text-sm ring-1 ring-slate-200">
                <p className="flex items-center gap-2 font-semibold text-slate-900">
                  <Icon name={s.icono} className="size-4 text-slate-400" /> {s.nombre}
                </p>
                {s.prioridad.desbloqueo.map((p, j) => (
                  <div key={j} className="mt-1.5">
                    <p className="text-slate-700">
                      <span className="font-medium">Para habilitarlo:</span> {p.texto.charAt(0).toLowerCase() + p.texto.slice(1)}.
                    </p>
                    {p.detalle && <p className="text-xs text-slate-500">{p.detalle}</p>}
                    {p.servicio_id && (
                      <button
                        onClick={() => onIrA(p.servicio_id)}
                        className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-alcaldia-700 hover:text-alcaldia-800 hover:underline"
                      >
                        {p.servicio_nombre} <ArrowRight className="size-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}
              </li>
            ))}
          </ul>
        </div>
      )}

      {seguimiento.length > 0 && (
        <p className="mt-4 flex items-start gap-2 text-xs text-slate-500">
          <History className="mt-px size-4 shrink-0" aria-hidden="true" />
          <span>
            No se lo sugerimos de nuevo:{' '}
            {seguimiento
              .map((s) => `${s.nombre} (${s.prioridad.historial.situacion === 'VIGENTE' ? 'ya es beneficiario(a)' : 'solicitud en curso'})`)
              .join(' · ')}
          </span>
        </p>
      )}
    </section>
  )
}
