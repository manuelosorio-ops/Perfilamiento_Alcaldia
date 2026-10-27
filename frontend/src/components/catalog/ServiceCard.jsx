import { useState } from 'react'
import { Building, Check, CheckCircle2, ChevronDown, Clock, Eye, Lock, Play, Sparkles, Wallet, X } from 'lucide-react'
import Badge from '../ui/Badge'
import Icon from '../ui/Icon'

export default function ServiceCard({ servicio: s, categoria, onIniciar }) {
  const [verRequisitos, setVerRequisitos] = useState(false)
  const apto = s.estado === 'APTO'
  const revision = s.estado === 'REQUIERE_REVISION'
  const habilitado = apto || revision
  const ia = s.evaluacion_ia

  return (
    <article
      className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition ${
        apto ? 'border-slate-200 hover:border-alcaldia-300 hover:shadow-md' : revision ? 'border-amber-200' : 'border-slate-200 bg-slate-50/60'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${apto ? 'bg-alcaldia-50 text-alcaldia-700' : 'bg-slate-100 text-slate-400'}`}>
          <Icon name={s.icono} className="size-5" />
        </span>
        {apto ? (
          <Badge tono="verde" icon={CheckCircle2}>Apto</Badge>
        ) : revision ? (
          <Badge tono="ambar" icon={Eye}>Requiere revisión</Badge>
        ) : (
          <Badge tono="rojo" icon={Lock}>No apto</Badge>
        )}
      </div>

      <p className="mt-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">{categoria?.nombre}</p>
      <h3 className={`mt-0.5 font-bold leading-snug ${apto ? 'text-slate-900' : 'text-slate-600'}`}>{s.nombre}</h3>
      <p className="mt-1.5 text-sm text-slate-500">{s.descripcion}</p>

      <ul className="mt-3 space-y-1 text-xs text-slate-500">
        <li className="flex items-center gap-1.5"><Building className="size-3.5" aria-hidden="true" />{s.entidad}</li>
        <li className="flex items-center gap-1.5"><Clock className="size-3.5" aria-hidden="true" />{s.tiempo_respuesta}</li>
        <li className="flex items-center gap-1.5"><Wallet className="size-3.5" aria-hidden="true" />{s.costo}</li>
      </ul>

      {!apto && (
        <div className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="note">
          {revision ? <Eye className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
          <p><span className="font-semibold">Motivo: </span>{s.motivo_rechazo}</p>
        </div>
      )}

      {ia && (
        <div className={`mt-3 rounded-xl border p-3 text-xs ${s.coincide ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-institucional-600/30 bg-institucional-50 text-institucional-700'}`}>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
            <Sparkles className="size-3.5" aria-hidden="true" />
            IA: {ia.estado === 'APTO' ? 'Apto' : 'No apto'} · confianza {Math.round(ia.confianza * 100)}%
            <span className="font-normal">· Reglas: {s.estado_reglas === 'APTO' ? 'Apto' : 'No apto'}</span>
            {!s.coincide && <Badge tono="azul">Discrepancia</Badge>}
          </p>
          {ia.motivo && <p className="mt-1">{ia.motivo}</p>}
        </div>
      )}

      {s.requisitos.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setVerRequisitos((v) => !v)}
            aria-expanded={verRequisitos}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            <ChevronDown className={`size-4 transition ${verRequisitos ? 'rotate-180' : ''}`} aria-hidden="true" />
            Requisitos ({s.requisitos.filter((r) => r.cumple).length}/{s.requisitos.length} cumplidos)
          </button>
          {verRequisitos && (
            <ul className="mt-2 space-y-1.5">
              {s.requisitos.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  {r.cumple ? (
                    <Check className="mt-px size-3.5 shrink-0 text-alcaldia-600" aria-label="Cumple" />
                  ) : (
                    <X className="mt-px size-3.5 shrink-0 text-red-600" aria-label="No cumple" />
                  )}
                  <span className={r.cumple ? 'text-slate-600' : 'text-slate-800'}>{r.descripcion}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {s.requisitos.length === 0 && <p className="mt-3 text-xs text-slate-400">Sin requisitos de perfil: abierto a toda la ciudadanía.</p>}

      <div className="mt-auto pt-4">
        <button
          onClick={() => onIniciar(s)}
          disabled={!habilitado}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-alcaldia-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-alcaldia-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          {apto ? (
            <><Play className="size-4" aria-hidden="true" /> Iniciar trámite</>
          ) : revision ? (
            <><Eye className="size-4" aria-hidden="true" /> Iniciar (revisión manual)</>
          ) : (
            <><Lock className="size-4" aria-hidden="true" /> No disponible</>
          )}
        </button>
      </div>
    </article>
  )
}
