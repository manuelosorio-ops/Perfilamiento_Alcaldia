import { useEffect, useRef, useState } from 'react'
import { Bot, Loader2, MessageCircle, Send, X } from 'lucide-react'
import { api } from '../../api/client'

const SUGERENCIAS = ['¿Qué trámites puedo hacer?', '¿Por qué no puedo pedir la beca Sapiencia?', '¿Tengo multas pendientes?']

/** Asistente IA (Azure OpenAI) que explica la elegibilidad del ciudadano activo. */
export default function AssistantPanel({ ciudadano }) {
  const [abierto, setAbierto] = useState(false)
  const [mensajes, setMensajes] = useState([])
  const [texto, setTexto] = useState('')
  const [cargando, setCargando] = useState(false)
  const finRef = useRef(null)

  // Conversación nueva cada vez que se cambia de ciudadano.
  useEffect(() => setMensajes([]), [ciudadano.id])
  useEffect(() => finRef.current?.scrollIntoView({ behavior: 'smooth' }), [mensajes, cargando])

  const enviar = async (contenido) => {
    const pregunta = contenido.trim()
    if (!pregunta || cargando) return
    const historial = mensajes
    setMensajes([...historial, { rol: 'user', contenido: pregunta }])
    setTexto('')
    setCargando(true)
    try {
      const { respuesta } = await api.asistente(ciudadano.id, pregunta, historial)
      setMensajes((m) => [...m, { rol: 'assistant', contenido: respuesta }])
    } catch (e) {
      setMensajes((m) => [...m, { rol: 'assistant', contenido: `⚠️ ${e.message}`, error: true }])
    } finally {
      setCargando(false)
    }
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="fixed right-4 bottom-4 z-40 inline-flex items-center gap-2 rounded-full bg-institucional-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-institucional-700 sm:right-6 sm:bottom-6"
      >
        <MessageCircle className="size-5" aria-hidden="true" /> Asistente
      </button>
    )
  }

  return (
    <aside className="fixed inset-x-2 bottom-2 z-40 flex h-[min(34rem,80vh)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-96" aria-label="Asistente virtual">
      <header className="flex items-center justify-between bg-institucional-600 px-4 py-3 text-white">
        <p className="flex items-center gap-2 text-sm font-semibold"><Bot className="size-5" aria-hidden="true" /> Asistente · {ciudadano.nombre.split(' ')[0]}</p>
        <button onClick={() => setAbierto(false)} aria-label="Cerrar asistente" className="rounded p-0.5 hover:bg-white/15"><X className="size-5" /></button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
        {mensajes.length === 0 && (
          <div className="space-y-2">
            <p className="text-slate-500">Pregúnteme sobre los trámites disponibles para este ciudadano.</p>
            {SUGERENCIAS.map((s) => (
              <button key={s} onClick={() => enviar(s)} className="block w-full rounded-xl bg-slate-50 px-3 py-2 text-left text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">{s}</button>
            ))}
          </div>
        )}
        {mensajes.map((m, i) => (
          <p
            key={i}
            className={`max-w-[85%] rounded-2xl px-3 py-2 whitespace-pre-wrap ${
              m.rol === 'user' ? 'ml-auto bg-institucional-600 text-white' : m.error ? 'bg-red-50 text-red-800' : 'bg-slate-100 text-slate-800'
            }`}
          >
            {m.contenido}
          </p>
        ))}
        {cargando && <Loader2 className="size-5 animate-spin text-slate-400" aria-label="Escribiendo" />}
        <div ref={finRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); enviar(texto) }} className="flex gap-2 border-t border-slate-100 p-3">
        <label className="sr-only" htmlFor="pregunta-asistente">Escriba su pregunta</label>
        <input
          id="pregunta-asistente"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escriba su pregunta…"
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-institucional-600 focus:outline-none"
        />
        <button type="submit" disabled={cargando || !texto.trim()} className="grid size-10 place-items-center rounded-xl bg-institucional-600 text-white disabled:opacity-50" aria-label="Enviar">
          <Send className="size-4" />
        </button>
      </form>
    </aside>
  )
}
