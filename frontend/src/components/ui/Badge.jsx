const TONOS = {
  verde: 'bg-alcaldia-50 text-alcaldia-700 ring-alcaldia-200',
  rojo: 'bg-red-50 text-red-700 ring-red-200',
  ambar: 'bg-amber-50 text-amber-800 ring-amber-200',
  azul: 'bg-institucional-50 text-institucional-700 ring-blue-200',
  gris: 'bg-slate-100 text-slate-600 ring-slate-200',
}

export default function Badge({ tono = 'gris', icon: IconCmp, children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONOS[tono]} ${className}`}
    >
      {IconCmp && <IconCmp className="size-3.5" aria-hidden="true" />}
      {children}
    </span>
  )
}

const ESTADOS_TRAMITE = {
  RADICADO: ['azul', 'Radicado'],
  EN_REVISION: ['ambar', 'En revisión'],
  APROBADO: ['verde', 'Aprobado'],
  FINALIZADO: ['verde', 'Finalizado'],
  RESPONDIDO: ['verde', 'Respondido'],
}

export function EstadoTramite({ estado }) {
  const [tono, etiqueta] = ESTADOS_TRAMITE[estado] ?? ['gris', estado]
  return <Badge tono={tono}>{etiqueta}</Badge>
}
