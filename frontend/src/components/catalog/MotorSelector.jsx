import { Cpu, GitMerge, Sparkles } from 'lucide-react'

export const MOTORES = [
  { id: 'reglas', etiqueta: 'Reglas', icono: Cpu, ayuda: 'Motor determinístico en Python: evalúa las reglas de data.json.' },
  { id: 'ia', etiqueta: 'IA', icono: Sparkles, ayuda: 'GPT-4.1 lee el perfil y los requisitos en texto y decide. Las reglas siguen protegiendo el radicado.' },
  { id: 'hibrido', etiqueta: 'Híbrido', icono: GitMerge, ayuda: 'Ambos evalúan. Las reglas niegan; si la IA discrepa de un "apto", el trámite pasa a revisión.' },
]

export default function MotorSelector({ motor, onChange, iaDisponible, cargando }) {
  const actual = MOTORES.find((m) => m.id === motor)
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-900">Motor de clasificación</p>
          <p className="text-xs text-slate-500">{actual?.ayuda}</p>
        </div>
        <div className="inline-flex self-start rounded-xl bg-slate-100 p-1" role="group" aria-label="Motor de clasificación">
          {MOTORES.map(({ id, etiqueta, icono: Icono }) => {
            const requiereIA = id !== 'reglas'
            const deshabilitado = cargando || (requiereIA && !iaDisponible)
            return (
              <button
                key={id}
                onClick={() => onChange(id)}
                disabled={deshabilitado}
                aria-pressed={motor === id}
                title={requiereIA && !iaDisponible ? 'Configure AZURE_OPENAI_* en backend/.env' : undefined}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  motor === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icono className={`size-4 ${id === 'reglas' ? '' : 'text-institucional-600'}`} aria-hidden="true" /> {etiqueta}
              </button>
            )
          })}
        </div>
      </div>
      {!iaDisponible && (
        <p className="mt-3 text-xs text-slate-500">
          Los modos IA e Híbrido se activan al configurar Azure OpenAI en <code className="rounded bg-slate-100 px-1">backend/.env</code>.
        </p>
      )}
    </div>
  )
}
