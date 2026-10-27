import { useMemo, useState } from 'react'
import { AlertTriangle, Loader2, SearchX, Sparkles } from 'lucide-react'
import MotorSelector from './MotorSelector'
import ServiceCard from './ServiceCard'
import ServiceFilters from './ServiceFilters'

const FILTROS_INICIALES = { categoria: 'todas', estado: 'TODOS', busqueda: '' }

/**
 * El backend devuelve el catálogo ya evaluado con el motor elegido
 * (GET /api/usuarios/{id}/clasificacion?motor=). Los filtros se aplican en cliente.
 */
export default function ServiceCatalog({ clasificacion, categorias, ciudadano, motor, onCambiarMotor, iaDisponible, cargando, onIniciar }) {
  const [filtros, setFiltros] = useState(FILTROS_INICIALES)
  const servicios = clasificacion.servicios
  const catPorId = useMemo(() => Object.fromEntries(categorias.map((c) => [c.id, c])), [categorias])

  const porCategoriaYTexto = useMemo(() => {
    const q = filtros.busqueda.trim().toLowerCase()
    return servicios.filter(
      (s) =>
        (filtros.categoria === 'todas' || s.categoria === filtros.categoria) &&
        (!q || `${s.nombre} ${s.entidad} ${s.descripcion}`.toLowerCase().includes(q)),
    )
  }, [servicios, filtros.categoria, filtros.busqueda])

  const contar = (estado) => porCategoriaYTexto.filter((s) => s.estado === estado).length
  const conteos = {
    TODOS: porCategoriaYTexto.length,
    APTO: contar('APTO'),
    NO_APTO: contar('NO_APTO'),
    REQUIERE_REVISION: contar('REQUIERE_REVISION'),
  }
  const visibles = porCategoriaYTexto.filter((s) => filtros.estado === 'TODOS' || s.estado === filtros.estado)
  const aptos = servicios.filter((s) => s.estado === 'APTO').length
  const discrepancias = servicios.filter((s) => s.coincide === false)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Trámites y servicios</h1>
        <p className="mt-1 text-slate-500">
          Catálogo evaluado para <span className="font-semibold text-slate-700">{ciudadano.nombre}</span>: tiene{' '}
          <span className="font-semibold text-alcaldia-700">{aptos} de {servicios.length}</span> trámites disponibles según su perfil.
        </p>
      </div>

      <MotorSelector motor={motor} onChange={onCambiarMotor} iaDisponible={iaDisponible} cargando={cargando} />

      {cargando && motor !== 'reglas' && (
        <p className="flex items-center gap-2 rounded-xl bg-institucional-50 p-3 text-sm font-medium text-institucional-700" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Consultando el modelo de IA para clasificar los {servicios.length} trámites…
        </p>
      )}

      {clasificacion.ia_error && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="alert">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            No se pudo consultar el modelo ({clasificacion.ia_error}). Se muestran los resultados del motor de <b>reglas</b>.
          </span>
        </p>
      )}

      {clasificacion.coincidencias != null && (
        <div className="flex flex-col gap-1 rounded-xl border border-institucional-600/20 bg-institucional-50 p-3 text-sm text-institucional-700 sm:flex-row sm:items-center sm:gap-3">
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <Sparkles className="size-4" aria-hidden="true" /> {clasificacion.modelo}
          </span>
          <span>
            coincide con las reglas en <b>{clasificacion.coincidencias} de {servicios.length}</b> trámites
            {discrepancias.length > 0 && <> · discrepa en: {discrepancias.map((s) => s.id).join(', ')}</>}
          </span>
        </div>
      )}

      <ServiceFilters categorias={categorias} filtros={filtros} onChange={setFiltros} conteos={conteos} />

      {visibles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <SearchX className="mx-auto size-8 text-slate-400" aria-hidden="true" />
          <p className="mt-2 font-semibold text-slate-700">No hay trámites con estos filtros</p>
          <button onClick={() => setFiltros(FILTROS_INICIALES)} className="mt-2 text-sm font-semibold text-alcaldia-700 hover:underline">
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className={`grid gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-3 ${cargando ? 'opacity-50' : ''}`}>
          {visibles.map((s) => (
            <ServiceCard key={s.id} servicio={s} categoria={catPorId[s.categoria]} onIniciar={onIniciar} />
          ))}
        </div>
      )}
    </div>
  )
}
