import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { api } from './api/client'
import Header from './components/layout/Header'
import Tabs from './components/layout/Tabs'
import Footer from './components/layout/Footer'
import CitizenProfile from './components/profile/CitizenProfile'
import ServiceCatalog from './components/catalog/ServiceCatalog'
import StartServiceModal from './components/catalog/StartServiceModal'
import AssistantPanel from './components/assistant/AssistantPanel'
import Toast from './components/ui/Toast'

const leer = (clave, defecto) => {
  try {
    return localStorage.getItem(clave) ?? defecto
  } catch {
    return defecto
  }
}
const guardar = (clave, valor) => {
  try {
    localStorage.setItem(clave, String(valor))
  } catch {
    /* almacenamiento no disponible */
  }
}

export default function App() {
  const [usuarios, setUsuarios] = useState([])
  const [categorias, setCategorias] = useState([])
  const [usuarioId, setUsuarioId] = useState(() => Number(leer('usuarioActivo', 1)) || 1)
  // Modo IA por defecto; si Azure no está configurado se cambia a 'reglas' al cargar.
  const [motor, setMotor] = useState(() => leer('motorClasificacion', 'ia'))
  const [ciudadano, setCiudadano] = useState(null)
  const [recomendaciones, setRecomendaciones] = useState(null)
  const [clasificacion, setClasificacion] = useState(null)
  const [vista, setVista] = useState('ficha')
  const [cargandoPerfil, setCargandoPerfil] = useState(true)
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true)
  const [error, setError] = useState('')
  const [iaHabilitada, setIaHabilitada] = useState(false)
  const [iaVerificada, setIaVerificada] = useState(false) // evita pedir modo IA antes de saber si hay Azure
  const [servicioEnCurso, setServicioEnCurso] = useState(null)
  const [toast, setToast] = useState(null)
  const peticionCatalogo = useRef(0)

  // Carga inicial: usuarios, categorías y estado del backend (¿hay IA configurada?).
  useEffect(() => {
    Promise.all([api.usuarios(), api.categorias(), api.salud()])
      .then(([u, c, s]) => {
        setUsuarios(u)
        setCategorias(c)
        setIaHabilitada(s.asistente_ia)
        if (!s.asistente_ia) setMotor('reglas')
        setIaVerificada(true)
        if (!u.some((x) => x.id === usuarioId)) setUsuarioId(u[0]?.id)
      })
      .catch(() => setError('No se pudo conectar con el backend. ¿Está corriendo en http://localhost:8000?'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cargarPerfil = useCallback(async (id) => {
    setCargandoPerfil(true)
    try {
      // Si la priorización falla, la ficha se muestra igual, sin el bloque de recomendaciones.
      const [perfil, reco] = await Promise.all([api.usuario(id), api.recomendaciones(id).catch(() => null)])
      setCiudadano(perfil)
      setRecomendaciones(reco)
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setCargandoPerfil(false)
    }
  }, [])

  // El catálogo se carga aparte: con IA puede tardar unos segundos y no debe bloquear la ficha.
  const cargarCatalogo = useCallback(async (id, m) => {
    const n = ++peticionCatalogo.current // descarta respuestas viejas si el usuario cambia rápido
    setCargandoCatalogo(true)
    try {
      const r = await api.clasificacion(id, m)
      if (n === peticionCatalogo.current) setClasificacion(r)
    } catch (e) {
      if (n === peticionCatalogo.current) setError(e.message)
    } finally {
      if (n === peticionCatalogo.current) setCargandoCatalogo(false)
    }
  }, [])

  useEffect(() => {
    if (!usuarioId) return
    cargarPerfil(usuarioId)
    guardar('usuarioActivo', usuarioId)
  }, [usuarioId, cargarPerfil])

  useEffect(() => {
    if (!usuarioId || !iaVerificada) return
    cargarCatalogo(usuarioId, motor)
    if (iaHabilitada) guardar('motorClasificacion', motor) // solo se recuerda una elección real del usuario
  }, [usuarioId, motor, iaVerificada, iaHabilitada, cargarCatalogo])

  const alRadicar = (r) => {
    setToast({
      tipo: 'exito',
      titulo: `${r.estado === 'EN_REVISION' ? 'Radicado para revisión' : 'Trámite radicado'}: ${r.radicado}`,
      mensaje: r.servicio_nombre,
    })
    // El nuevo trámite queda "en curso": cambian las sugerencias y el orden del catálogo.
    cargarPerfil(usuarioId)
    cargarCatalogo(usuarioId, motor)
  }

  // Desde una sugerencia ("Puede habilitar") se abre directamente el trámite que ayuda.
  const irATramite = (servicioId) => {
    const s = clasificacion?.servicios.find((x) => x.id === servicioId)
    if (s) setServicioEnCurso(s)
  }

  const restablecer = async () => {
    await api.restablecer()
    await Promise.all([cargarPerfil(usuarioId), cargarCatalogo(usuarioId, motor)])
    setToast({ tipo: 'exito', titulo: 'Datos de demo restablecidos' })
  }

  const cerrarToast = useCallback(() => setToast(null), [])
  const aptos = clasificacion?.servicios.filter((s) => s.estado === 'APTO').length

  return (
    <div className="flex min-h-screen flex-col">
      <Header usuarios={usuarios} usuarioId={usuarioId} onCambiarUsuario={setUsuarioId} />
      <Tabs vista={vista} onCambiar={setVista} aptos={aptos} total={clasificacion?.servicios.length ?? 0} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800" role="alert">
            <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <p>{error}</p>
          </div>
        ) : !ciudadano || (vista === 'tramites' && !clasificacion) ? (
          <div className="grid place-items-center py-24 text-slate-400"><Loader2 className="size-8 animate-spin" aria-label="Cargando" /></div>
        ) : vista === 'ficha' ? (
          <div className={`transition-opacity ${cargandoPerfil ? 'opacity-50' : ''}`} aria-busy={cargandoPerfil}>
            <CitizenProfile
              ciudadano={ciudadano}
              recomendaciones={recomendaciones}
              categorias={categorias}
              onVerTramites={() => setVista('tramites')}
              onIniciar={setServicioEnCurso}
              onIrA={irATramite}
            />
          </div>
        ) : (
          <ServiceCatalog
            clasificacion={clasificacion}
            categorias={categorias}
            ciudadano={ciudadano}
            segmentos={recomendaciones?.segmentos}
            motor={motor}
            onCambiarMotor={setMotor}
            iaDisponible={iaHabilitada}
            cargando={cargandoCatalogo}
            onIniciar={setServicioEnCurso}
            onIrA={irATramite}
          />
        )}
      </main>

      <Footer onRestablecer={restablecer} />

      {servicioEnCurso && ciudadano && (
        <StartServiceModal
          servicio={servicioEnCurso}
          ciudadano={ciudadano}
          motor={motor}
          onClose={() => setServicioEnCurso(null)}
          onRadicado={alRadicar}
        />
      )}
      {iaHabilitada && ciudadano && <AssistantPanel ciudadano={ciudadano} />}
      <Toast toast={toast} onClose={cerrarToast} />
    </div>
  )
}
