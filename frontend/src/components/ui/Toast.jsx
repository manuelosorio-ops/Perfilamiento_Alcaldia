import { useEffect } from 'react'
import { CheckCircle2, XCircle, X } from 'lucide-react'

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, 5000)
    return () => clearTimeout(t)
  }, [toast, onClose])

  if (!toast) return null
  const exito = toast.tipo === 'exito'
  const Icono = exito ? CheckCircle2 : XCircle
  return (
    <div className="fixed inset-x-4 top-4 z-50 flex justify-center sm:inset-x-auto sm:right-6 sm:top-6" role="status" aria-live="polite">
      <div className={`flex max-w-md items-start gap-3 rounded-xl border bg-white p-4 shadow-lg ${exito ? 'border-alcaldia-200' : 'border-red-200'}`}>
        <Icono className={`mt-0.5 size-5 shrink-0 ${exito ? 'text-alcaldia-600' : 'text-red-600'}`} aria-hidden="true" />
        <div className="text-sm">
          <p className="font-semibold text-slate-900">{toast.titulo}</p>
          {toast.mensaje && <p className="mt-0.5 text-slate-600">{toast.mensaje}</p>}
        </div>
        <button onClick={onClose} className="ml-2 rounded p-0.5 text-slate-400 hover:text-slate-600" aria-label="Cerrar notificación">
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
