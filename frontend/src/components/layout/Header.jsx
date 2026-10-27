import { FlaskConical, Landmark } from 'lucide-react'
import UserSwitcher from './UserSwitcher'

export default function Header({ usuarios, usuarioId, onCambiarUsuario }) {
  return (
    <header>
      <div className="bg-alcaldia-900 text-alcaldia-100">
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-4 px-4 py-1.5 sm:justify-between text-xs sm:px-6">
          <span className="hidden font-semibold tracking-wide sm:inline">Portal de Trámites y Servicios</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/90 px-2 py-0.5 font-semibold text-amber-950">
            <FlaskConical className="size-3.5" aria-hidden="true" /> Prototipo · datos simulados
          </span>
        </div>
      </div>
      <div className="bg-gradient-to-r from-alcaldia-700 to-alcaldia-600 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {/* Emblema genérico: no reproduce el escudo oficial */}
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-alcaldia-700 shadow">
              <Landmark className="size-6" aria-hidden="true" />
            </span>
            <div className="min-w-0 leading-tight text-white">
              <p className="text-[11px] font-medium tracking-[0.18em] text-alcaldia-100 uppercase">Alcaldía de</p>
              <p className="truncate text-xl font-extrabold tracking-tight">Medellín</p>
            </div>
          </div>
          <UserSwitcher usuarios={usuarios} usuarioId={usuarioId} onChange={onCambiarUsuario} />
        </div>
      </div>
    </header>
  )
}
