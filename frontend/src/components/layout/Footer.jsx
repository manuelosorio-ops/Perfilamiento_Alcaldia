import { RotateCcw } from 'lucide-react'

export default function Footer({ onRestablecer }) {
  return (
    <footer className="mt-12 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 pt-6 pb-24 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>Prototipo funcional con datos ficticios. No corresponde a sistemas oficiales de la Alcaldía de Medellín.</p>
        <button
          onClick={onRestablecer}
          className="inline-flex items-center gap-1.5 self-start rounded-lg px-3 py-1.5 font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
        >
          <RotateCcw className="size-4" aria-hidden="true" /> Restablecer datos de demo
        </button>
      </div>
    </footer>
  )
}
