import { useState } from 'react'
import { ArrowDownUp, Check, ChevronDown, CircleHelp, Cpu, GitMerge, ShieldCheck, Sparkles } from 'lucide-react'

export const MOTORES = [
  {
    id: 'reglas',
    etiqueta: 'Reglas',
    icono: Cpu,
    ayuda: 'Motor determinístico en Python: evalúa las reglas de data.json.',
    titulo: 'Python compara su perfil con los requisitos',
    pasos: [
      'Cada trámite trae sus requisitos en data.json: estrato 1 a 3, tener 60 años o más, al menos un predio…',
      'Se comparan con los datos del ciudadano: edad, estrato, Sisbén, predios, vehículos y multas.',
      'Si cumple todos los requisitos es Apto. Si falla uno, es No apto y se muestra el requisito exacto que no cumple.',
    ],
    sello: 'Inmediato · sin costo · siempre da el mismo resultado',
  },
  {
    id: 'ia',
    etiqueta: 'IA',
    icono: Sparkles,
    ayuda: 'GPT-4.1 lee el perfil y los requisitos en texto y decide. Las reglas siguen protegiendo el radicado.',
    titulo: 'GPT-4.1 interpreta los requisitos',
    pasos: [
      'Se envía al modelo el perfil y los 20 trámites con sus requisitos escritos en texto. No se le dice qué opinan las reglas, para que su juicio sea independiente.',
      'El modelo decide Apto o No apto en cada trámite, con un motivo y su porcentaje de confianza.',
      'Cada tarjeta muestra el veredicto de la IA junto al de las reglas y marca las discrepancias.',
    ],
    sello: 'Una consulta por ciudadano · el resultado se guarda en caché',
  },
  {
    id: 'hibrido',
    etiqueta: 'Híbrido',
    icono: GitMerge,
    ayuda: 'Ambos evalúan. Las reglas niegan; si la IA discrepa de un "apto", el trámite pasa a revisión.',
    titulo: 'Las dos opiniones se combinan',
    pasos: [
      'Los dos motores evalúan el mismo perfil.',
      'Si las reglas dicen No apto, el trámite es No apto: la normativa tiene la última palabra para negar.',
      'Si los dos dicen Apto, el trámite es Apto.',
      'Si las reglas dicen Apto pero la IA tiene dudas, queda en "Requiere revisión": se puede radicar y una persona lo revisa.',
    ],
    sello: 'El más seguro para operar con IA',
  },
]

const leerAbierto = () => {
  try {
    return localStorage.getItem('motorAyudaAbierta') !== 'false'
  } catch {
    return true
  }
}

function TarjetaModo({ modo, activo, deshabilitado, onElegir }) {
  const { id, etiqueta, icono: Icono, titulo, pasos, sello } = modo
  return (
    <button
      type="button"
      onClick={() => onElegir(id)}
      disabled={deshabilitado}
      aria-pressed={activo}
      className={`flex h-full flex-col rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
        activo
          ? 'border-alcaldia-500 bg-alcaldia-50/60 ring-1 ring-alcaldia-500'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-900">
          <span className={`grid size-8 place-items-center rounded-lg ${id === 'reglas' ? 'bg-slate-100 text-slate-700' : 'bg-institucional-50 text-institucional-600'}`}>
            <Icono className="size-4" aria-hidden="true" />
          </span>
          {etiqueta}
        </span>
        {activo && (
          <span className="inline-flex items-center gap-1 rounded-full bg-alcaldia-600 px-2 py-0.5 text-[11px] font-semibold text-white">
            <Check className="size-3" aria-hidden="true" /> En uso
          </span>
        )}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-800">{titulo}</p>
      <ol className="mt-2 flex-1 space-y-1.5">
        {pasos.map((paso, i) => (
          <li key={i} className="flex gap-2 text-xs leading-relaxed text-slate-600">
            <span className="mt-px grid size-4 shrink-0 place-items-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">{i + 1}</span>
            <span>{paso}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 border-t border-slate-200/80 pt-2 text-[11px] font-medium text-slate-500">{sello}</p>
    </button>
  )
}

export default function MotorSelector({ motor, onChange, iaDisponible, cargando, segmentos = [] }) {
  const [abierto, setAbierto] = useState(leerAbierto)
  const actual = MOTORES.find((m) => m.id === motor)
  const deshabilitado = (id) => cargando || (id !== 'reglas' && !iaDisponible)

  const alternar = () => {
    setAbierto((v) => {
      try {
        localStorage.setItem('motorAyudaAbierta', String(!v))
      } catch {
        /* almacenamiento no disponible */
      }
      return !v
    })
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-900">Motor de clasificación</p>
          <p className="text-xs text-slate-500">{actual?.ayuda}</p>
          <button
            type="button"
            onClick={alternar}
            aria-expanded={abierto}
            aria-controls="ayuda-motores"
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-alcaldia-700 hover:text-alcaldia-800"
          >
            <CircleHelp className="size-3.5" aria-hidden="true" />
            {abierto ? 'Ocultar cómo funciona' : '¿Cómo funciona cada modo?'}
            <ChevronDown className={`size-3.5 transition ${abierto ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        </div>
        <div className="inline-flex self-start rounded-xl bg-slate-100 p-1 md:self-center" role="group" aria-label="Motor de clasificación">
          {MOTORES.map(({ id, etiqueta, icono: Icono }) => (
            <button
              key={id}
              onClick={() => onChange(id)}
              disabled={deshabilitado(id)}
              aria-pressed={motor === id}
              title={id !== 'reglas' && !iaDisponible ? 'Configure AZURE_OPENAI_* en backend/.env' : undefined}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                motor === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icono className={`size-4 ${id === 'reglas' ? '' : 'text-institucional-600'}`} aria-hidden="true" /> {etiqueta}
            </button>
          ))}
        </div>
      </div>

      {abierto && (
        <div id="ayuda-motores" className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">
            El motor decide si el ciudadano es <b className="text-slate-700">Apto</b> o <b className="text-slate-700">No apto</b> para cada trámite.
            Toque una tarjeta para cambiar de modo.
          </p>

          <div className="grid gap-3 md:grid-cols-3">
            {MOTORES.map((m) => (
              <TarjetaModo key={m.id} modo={m} activo={motor === m.id} deshabilitado={deshabilitado(m.id)} onElegir={onChange} />
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex gap-3 rounded-xl bg-slate-50 p-3">
              <ArrowDownUp className="mt-0.5 size-4 shrink-0 text-alcaldia-600" aria-hidden="true" />
              <div className="text-xs leading-relaxed text-slate-600">
                <p className="font-semibold text-slate-800">Igual en los 3 modos: el orden "Más relevantes para su perfil"</p>
                <p className="mt-0.5">
                  Primero se identifica el tipo de usuario
                  {segmentos.length > 0 && <> (aquí: <b className="text-slate-700">{segmentos.map((s) => s.nombre).join(', ')}</b>)</>}.
                  Luego cada trámite suma puntos según si es un beneficio u obligación, si hay algo urgente (como una multa pendiente),
                  qué tan dirigido está a ese perfil y lo que el ciudadano ya hizo. Lo ya aprobado o en curso no se vuelve a sugerir.
                  Este orden lo calculan reglas y pesos configurables; no usa IA.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl bg-slate-50 p-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-alcaldia-600" aria-hidden="true" />
              <div className="text-xs leading-relaxed text-slate-600">
                <p className="font-semibold text-slate-800">Igual en los 3 modos: la seguridad al radicar</p>
                <p className="mt-0.5">
                  Al iniciar un trámite, el servidor vuelve a verificar los requisitos con las reglas. La IA puede pedir que un caso
                  se revise, pero nunca puede habilitar un trámite que la normativa niega. Si Azure falla, el catálogo usa las reglas
                  automáticamente.
                </p>
              </div>
            </div>
          </div>

          {!iaDisponible && (
            <p className="text-xs text-slate-500">
              Los modos IA e Híbrido se activan al configurar Azure OpenAI en <code className="rounded bg-slate-100 px-1">backend/.env</code>.
            </p>
          )}
        </div>
      )}

      {!abierto && !iaDisponible && (
        <p className="mt-3 text-xs text-slate-500">
          Los modos IA e Híbrido se activan al configurar Azure OpenAI en <code className="rounded bg-slate-100 px-1">backend/.env</code>.
        </p>
      )}
    </div>
  )
}
