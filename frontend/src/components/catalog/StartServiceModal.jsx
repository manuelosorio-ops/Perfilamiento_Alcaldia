import { useEffect, useState } from 'react'
import { CheckCircle2, FileCheck2, Loader2, X, XCircle } from 'lucide-react'
import { api } from '../../api/client'
import Icon from '../ui/Icon'

/** Flujo simulado: confirmar → radicar (POST) → resultado con número de radicado. */
export default function StartServiceModal({ servicio, ciudadano, motor, onClose, onRadicado }) {
  const [fase, setFase] = useState('confirmar') // confirmar | enviando | exito | error
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && fase !== 'enviando' && onClose()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [fase, onClose])

  const radicar = async () => {
    setFase('enviando')
    try {
      const r = await api.iniciarTramite(ciudadano.id, servicio.id, motor)
      setResultado(r)
      setFase('exito')
      onRadicado(r)
    } catch (e) {
      setError(e.message)
      setFase('error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && fase !== 'enviando' && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="modal-titulo" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-alcaldia-50 text-alcaldia-700">
            <Icon name={servicio.icono} className="size-5" />
          </span>
          <button onClick={onClose} disabled={fase === 'enviando'} className="rounded p-1 text-slate-400 hover:text-slate-600" aria-label="Cerrar">
            <X className="size-5" />
          </button>
        </div>

        {(fase === 'confirmar' || fase === 'enviando') && (
          <>
            <h2 id="modal-titulo" className="mt-3 text-lg font-bold text-slate-900">{servicio.nombre}</h2>
            <p className="mt-1 text-sm text-slate-500">
              Va a iniciar este trámite a nombre de <span className="font-semibold text-slate-700">{ciudadano.nombre}</span> ante {servicio.entidad}.
            </p>
            {servicio.requisitos.length > 0 && (
              <ul className="mt-4 space-y-1.5 rounded-xl bg-alcaldia-50 p-3 text-sm text-alcaldia-900">
                {servicio.requisitos.map((r, i) => (
                  <li key={i} className="flex items-center gap-2"><CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />{r.descripcion}</li>
                ))}
              </ul>
            )}
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-slate-500">Tiempo estimado</dt><dd className="font-semibold">{servicio.tiempo_respuesta}</dd></div>
              <div><dt className="text-slate-500">Costo</dt><dd className="font-semibold">{servicio.costo}</dd></div>
            </dl>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={onClose} disabled={fase === 'enviando'} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={radicar} disabled={fase === 'enviando'} className="inline-flex items-center gap-2 rounded-xl bg-alcaldia-600 px-4 py-2 text-sm font-semibold text-white hover:bg-alcaldia-700 disabled:opacity-70">
                {fase === 'enviando' ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <FileCheck2 className="size-4" aria-hidden="true" />}
                Confirmar y radicar
              </button>
            </div>
          </>
        )}

        {fase === 'exito' && resultado && (
          <div className="mt-3 text-center">
            <CheckCircle2 className={`mx-auto size-12 ${resultado.estado === 'EN_REVISION' ? 'text-amber-500' : 'text-alcaldia-600'}`} aria-hidden="true" />
            <h2 id="modal-titulo" className="mt-2 text-lg font-bold text-slate-900">
              {resultado.estado === 'EN_REVISION' ? 'Radicada para revisión manual' : '¡Solicitud radicada!'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{resultado.mensaje}</p>
            <p className="mt-4 rounded-xl bg-slate-50 py-3 font-mono text-lg font-bold tracking-wider text-slate-900">{resultado.radicado}</p>
            <button onClick={onClose} className="mt-5 w-full rounded-xl bg-alcaldia-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-alcaldia-700">Entendido</button>
          </div>
        )}

        {fase === 'error' && (
          <div className="mt-3 text-center">
            <XCircle className="mx-auto size-12 text-red-600" aria-hidden="true" />
            <h2 id="modal-titulo" className="mt-2 text-lg font-bold text-slate-900">No fue posible radicar</h2>
            <p className="mt-1 text-sm text-slate-600">{error}</p>
            <button onClick={onClose} className="mt-5 w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">Cerrar</button>
          </div>
        )}
      </div>
    </div>
  )
}
