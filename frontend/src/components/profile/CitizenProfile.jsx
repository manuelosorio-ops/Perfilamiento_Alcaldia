import {
  AlertTriangle, ArrowRight, Bike, Briefcase, Car, CheckCircle2, CreditCard, HeartPulse,
  Home, Mail, MapPin, Phone, ShieldCheck, Store, UserRound,
} from 'lucide-react'
import { formatoCOP } from '../../api/client'
import { Avatar } from '../layout/UserSwitcher'
import Badge, { EstadoTramite } from '../ui/Badge'
import Recommendations from '../recommendations/Recommendations'

function Tarjeta({ titulo, icono: Icono, accion, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <Icono className="size-5 text-alcaldia-600" aria-hidden="true" /> {titulo}
        </h2>
        {accion}
      </div>
      {children}
    </section>
  )
}

function Dato({ etiqueta, valor, nota }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{etiqueta}</dt>
      <dd className="mt-1 text-2xl font-extrabold text-slate-900">{valor}</dd>
      {nota && <dd className="text-xs text-slate-500">{nota}</dd>}
    </div>
  )
}

const Vacio = ({ children }) => <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">{children}</p>

export default function CitizenProfile({ ciudadano: c, recomendaciones, categorias, onVerTramites, onIniciar, onIrA }) {
  const ind = c.indicadores
  const etiquetas = [
    ind.adulto_mayor && ['Adulto mayor', 'azul'],
    c.estudiante && ['Estudiante', 'azul'],
    c.pensionado && ['Pensionado(a)', 'gris'],
    c.registro_mercantil && ['Registro mercantil', 'gris'],
    c.discapacidad && ['Persona con discapacidad', 'azul'],
  ].filter(Boolean)
  const porcentaje = Math.round((ind.servicios_aptos / ind.servicios_total) * 100)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Identificación */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-3">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <Avatar usuario={c} size="size-16 text-xl" />
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">{c.nombre}</h1>
              <p className="text-sm text-slate-500">
                {c.tipo_documento} {Number(c.documento).toLocaleString('es-CO')} · {c.ocupacion}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {etiquetas.map(([t, tono]) => <Badge key={t} tono={tono}>{t}</Badge>)}
                {ind.multas_pendientes > 0 ? (
                  <Badge tono="rojo" icon={AlertTriangle}>{ind.multas_pendientes} multa(s) activa(s)</Badge>
                ) : (
                  <Badge tono="verde" icon={ShieldCheck}>Sin multas</Badge>
                )}
              </div>
            </div>
          </div>
          <ul className="grid gap-1.5 text-sm text-slate-600">
            <li className="flex items-center gap-2"><MapPin className="size-4 text-slate-400" aria-hidden="true" />{c.direccion} · {c.barrio}, {c.comuna}</li>
            <li className="flex items-center gap-2"><Mail className="size-4 text-slate-400" aria-hidden="true" />{c.correo}</li>
            <li className="flex items-center gap-2"><Phone className="size-4 text-slate-400" aria-hidden="true" />{c.telefono}</li>
          </ul>
        </div>
      </section>

      {/* Recomendaciones según el perfil (priorizacion.py) */}
      <Recommendations datos={recomendaciones} categorias={categorias} onIniciar={onIniciar} onIrA={onIrA} />

      {/* Resumen socioeconómico */}
      <Tarjeta titulo="Resumen socioeconómico" icono={UserRound} className="lg:col-span-2">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Dato etiqueta="Edad" valor={c.edad} nota="años" />
          <Dato etiqueta="Estrato" valor={c.estrato} nota="socioeconómico" />
          <Dato etiqueta="Sisbén IV" valor={c.sisben_grupo ?? '—'} nota={c.sisben_grupo ? `Grupo ${c.sisben_grupo[0]}` : 'Sin clasificación'} />
          <Dato etiqueta="Salud" valor={<HeartPulse className="size-7 text-alcaldia-600" aria-label="Régimen" />} nota={`Régimen ${c.regimen_salud.toLowerCase()}`} />
        </dl>
      </Tarjeta>

      {/* Elegibilidad */}
      <Tarjeta titulo="Elegibilidad en el catálogo" icono={CheckCircle2}>
        <p className="text-4xl font-extrabold text-alcaldia-700">
          {ind.servicios_aptos}<span className="text-lg font-semibold text-slate-400"> / {ind.servicios_total}</span>
        </p>
        <p className="text-sm text-slate-500">trámites disponibles para este perfil (motor de reglas)</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={porcentaje} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-alcaldia-500" style={{ width: `${porcentaje}%` }} />
        </div>
        <button onClick={onVerTramites} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-alcaldia-700 hover:text-alcaldia-800">
          Ver trámites <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </Tarjeta>

      {/* Predios */}
      <Tarjeta titulo={`Predios asociados (${ind.total_predios})`} icono={Home}>
        {c.predios.length === 0 ? <Vacio>No registra predios a su nombre.</Vacio> : (
          <ul className="space-y-3">
            {c.predios.map((p) => (
              <li key={p.matricula} className="rounded-xl bg-slate-50 p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="flex items-center gap-1.5 font-semibold text-slate-900">
                    {p.destino === 'Comercial' ? <Store className="size-4" aria-hidden="true" /> : <Home className="size-4" aria-hidden="true" />}
                    {p.tipo}
                  </p>
                  {p.vis && <Badge tono="azul">VIS</Badge>}
                </div>
                <p className="text-slate-600">{p.direccion}</p>
                <p className="mt-1 text-xs text-slate-500">Matrícula {p.matricula} · Avalúo {formatoCOP(p.avaluo_catastral)}</p>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      {/* Vehículos */}
      <Tarjeta titulo={`Vehículos registrados (${ind.total_vehiculos})`} icono={Car}>
        {c.vehiculos.length === 0 ? <Vacio>No registra vehículos en el RUNT.</Vacio> : (
          <ul className="space-y-3">
            {c.vehiculos.map((v) => (
              <li key={v.placa} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm">
                <span className="rounded-md border-2 border-slate-800 bg-yellow-300 px-2 py-0.5 font-mono text-sm font-bold tracking-wider text-slate-900">
                  {v.placa}
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 font-semibold text-slate-900">
                    {v.tipo === 'Motocicleta' ? <Bike className="size-4" aria-hidden="true" /> : <Car className="size-4" aria-hidden="true" />}
                    {v.marca} {v.modelo}
                  </p>
                  <p className="text-xs text-slate-500">SOAT {v.soat_vigente ? 'vigente' : 'vencido'} · RTM {v.tecnomecanica_vigente ? 'vigente' : 'vencida'}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
          <CreditCard className="size-4" aria-hidden="true" />
          {c.licencia_conduccion
            ? `Licencia ${c.licencia_conduccion.categoria} vigente hasta ${c.licencia_conduccion.vigencia}`
            : 'Sin licencia de conducción'}
        </p>
      </Tarjeta>

      {/* Multas */}
      <Tarjeta
        titulo="Multas y sanciones"
        icono={AlertTriangle}
        accion={ind.multas_pendientes > 0 && <Badge tono="rojo">{formatoCOP(ind.valor_multas_pendientes)}</Badge>}
      >
        {c.multas.length === 0 ? (
          <p className="flex items-center gap-2 rounded-xl bg-alcaldia-50 p-4 text-sm font-medium text-alcaldia-800">
            <ShieldCheck className="size-5" aria-hidden="true" /> Está al día. No registra multas pendientes.
          </p>
        ) : (
          <ul className="space-y-3">
            {c.multas.map((m) => (
              <li key={m.id} className="rounded-xl border border-red-100 bg-red-50/60 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <Badge tono={m.estado === 'PENDIENTE' ? 'rojo' : 'gris'}>
                    {m.tipo === 'FOTOMULTA' ? 'Fotomulta' : m.tipo === 'CONVIVENCIA' ? 'Código de Policía' : 'Comparendo'}
                  </Badge>
                  <span className="font-bold text-red-700">{formatoCOP(m.valor)}</span>
                </div>
                <p className="mt-1.5 text-slate-700">{m.descripcion}</p>
                <p className="text-xs text-slate-500">{m.id} · {m.fecha} · {m.estado.toLowerCase()}</p>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      {/* Trámites recientes */}
      <Tarjeta titulo="Trámites recientes" icono={Briefcase} className="lg:col-span-3">
        {c.tramites_recientes.length === 0 ? <Vacio>Aún no ha realizado trámites.</Vacio> : (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="text-xs text-slate-500 uppercase">
                <tr className="border-b border-slate-100">
                  <th className="py-2 pr-4 font-semibold">Radicado</th>
                  <th className="py-2 pr-4 font-semibold">Trámite</th>
                  <th className="py-2 pr-4 font-semibold">Fecha</th>
                  <th className="py-2 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {c.tramites_recientes.map((t) => (
                  <tr key={t.radicado} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5 pr-4 font-mono text-xs text-slate-600">{t.radicado}</td>
                    <td className="py-2.5 pr-4 font-medium text-slate-900">{t.servicio_nombre}</td>
                    <td className="py-2.5 pr-4 text-slate-600">{t.fecha}</td>
                    <td className="py-2.5"><EstadoTramite estado={t.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

    </div>
  )
}
