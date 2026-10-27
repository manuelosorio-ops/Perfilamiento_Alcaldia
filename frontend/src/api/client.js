// Cliente HTTP del portal. En desarrollo Vite redirige /api → http://localhost:8000.
const BASE = import.meta.env.VITE_API_URL ?? ''

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let detail
    try {
      detail = (await res.json()).detail
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    const mensaje =
      typeof detail === 'string' ? detail : detail?.motivo_rechazo || detail?.mensaje || `Error ${res.status}`
    const error = new Error(mensaje)
    error.status = res.status
    error.detail = detail
    throw error
  }
  return res.status === 204 ? null : res.json()
}

export const api = {
  salud: () => request('/api/salud'),
  usuarios: () => request('/api/usuarios'),
  usuario: (id) => request(`/api/usuarios/${id}`),
  categorias: () => request('/api/categorias'),
  servicios: (id, { categoria, estado } = {}) => {
    const qs = new URLSearchParams()
    if (categoria) qs.set('categoria', categoria)
    if (estado) qs.set('estado', estado)
    const q = qs.toString()
    return request(`/api/usuarios/${id}/servicios${q ? `?${q}` : ''}`)
  },
  // motor: 'reglas' | 'ia' | 'hibrido'
  clasificacion: (id, motor = 'reglas') => request(`/api/usuarios/${id}/clasificacion?motor=${motor}`),
  iniciarTramite: (usuarioId, servicioId, motor = 'reglas') =>
    request(`/api/usuarios/${usuarioId}/servicios/${servicioId}/iniciar?motor=${motor}`, { method: 'POST' }),
  asistente: (usuarioId, mensaje, historial) =>
    request(`/api/usuarios/${usuarioId}/asistente`, {
      method: 'POST',
      body: JSON.stringify({ mensaje, historial }),
    }),
  restablecer: () => request('/api/demo/restablecer', { method: 'POST' }),
}

export const formatoCOP = (valor) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor)

export const iniciales = (nombre = '') =>
  nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
