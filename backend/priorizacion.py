"""Motor de priorización: qué trámites mostrarle primero a cada ciudadano y qué sugerirle.

Complementa al motor de elegibilidad (elegibilidad.py), que sigue siendo la única fuente
de verdad sobre APTO / NO_APTO. Este módulo solo ORDENA y SUGIERE; nunca habilita nada.

1. Perfilamiento: el ciudadano pertenece a uno o varios segmentos ("tipo de usuario":
   estudiante, persona mayor, propietario, conductor…). Los segmentos se definen con
   reglas del mismo motor ABAC, así que no hay lógica nueva que mantener.
2. Puntaje por servicio = suma de razones explicables:
     tipo de servicio       (beneficio, obligación, trámite, general)
   + impulsos              (condiciones del perfil: multa pendiente, sin Sisbén…)
   + intereses             (puntos que cada segmento del ciudadano asigna al servicio)
   + especificidad         (puntos por requisito: lo dirigido a su perfil va antes que lo genérico)
   + historial             (lo realizado hace poco baja; lo en curso o vigente se excluye)
3. Recomendados: los mejores APTO con puntaje mínimo y diversidad por categoría.
4. Desbloqueables: NO_APTO cuyos requisitos fallidos el ciudadano puede resolver
   (p. ej. pagar una multa o hacer la encuesta Sisbén), con el paso a seguir.

Todo es determinístico y se configura en perfilamiento.json, que se relee en cada petición
(cambiar pesos o segmentos no requiere reiniciar el servidor).
"""
from __future__ import annotations

import json
from collections import Counter
from datetime import date
from pathlib import Path
from typing import Optional

from elegibilidad import evaluar_regla
from models import (
    ConfigPerfilamiento,
    EstadoServicio,
    HistorialServicio,
    PasoDesbloqueo,
    Prioridad,
    Razon,
    Recomendaciones,
    Regla,
    Segmento,
    SegmentoConfig,
    ServicioEvaluado,
    ServicioPrioridadConfig,
    Usuario,
)

CONFIG_FILE = Path(__file__).resolve().parent / "perfilamiento.json"


def cargar_config(path: Path = CONFIG_FILE) -> ConfigPerfilamiento:
    with open(path, encoding="utf-8") as f:
        return ConfigPerfilamiento.model_validate(json.load(f))


def _cumple(usuario: Usuario, reglas: list[Regla]) -> bool:
    return all(evaluar_regla(usuario, r).cumple for r in reglas)


# --- 1. Perfilamiento ---------------------------------------------------------
def segmentar(usuario: Usuario, config: ConfigPerfilamiento) -> list[SegmentoConfig]:
    return [s for s in config.segmentos if s.reglas and _cumple(usuario, s.reglas)]


# --- 2. Puntaje -----------------------------------------------------------------
def _historial(usuario: Usuario, servicio_id: str, config: ConfigPerfilamiento, hoy: date) -> Optional[HistorialServicio]:
    tramites = sorted(
        (t for t in usuario.tramites_recientes if t.servicio_id == servicio_id),
        key=lambda t: t.fecha,
        reverse=True,
    )
    h = config.historial
    for situacion, estados in (("EN_CURSO", h.en_curso), ("VIGENTE", h.vigente)):
        t = next((t for t in tramites if t.estado in estados), None)
        if t:
            return HistorialServicio(situacion=situacion, radicado=t.radicado, estado=t.estado, fecha=t.fecha)
    for t in tramites:
        if t.estado in h.finalizado:
            try:
                dias = (hoy - date.fromisoformat(t.fecha)).days
            except ValueError:
                continue
            if dias <= config.pesos.ventana_reciente_dias:
                return HistorialServicio(situacion="RECIENTE", radicado=t.radicado, estado=t.estado, fecha=t.fecha)
    return None


_TEXTO_HISTORIAL = {
    "EN_CURSO": "Ya tiene una solicitud en curso ({radicado})",
    "VIGENTE": "Ya es beneficiario(a): aprobado el {fecha}",
    "RECIENTE": "Lo realizó recientemente ({fecha})",
}


def _puntuar(
    usuario: Usuario,
    s: ServicioEvaluado,
    segmentos: list[SegmentoConfig],
    config: ConfigPerfilamiento,
    hoy: date,
) -> Prioridad:
    cfg = config.servicios.get(s.id, ServicioPrioridadConfig())
    razones: list[Razon] = []

    tipo = config.tipos.get(cfg.tipo)
    if tipo:
        razones.append(Razon(tipo="tipo", texto=tipo.razon, puntos=tipo.puntos))

    urgente = False
    for imp in cfg.impulsos:
        if _cumple(usuario, imp.reglas):
            razones.append(Razon(tipo="impulso", texto=imp.razon, puntos=imp.puntos))
            urgente = urgente or imp.urgente

    for seg in segmentos:
        puntos = seg.intereses.get(s.id)
        if puntos:
            razones.append(Razon(tipo="segmento", texto=seg.razon, puntos=puntos))

    n = len(s.requisitos)
    if n and config.pesos.por_requisito:
        razones.append(Razon(
            tipo="especificidad",
            texto=f"Dirigido a perfiles específicos ({n} {'requisito' if n == 1 else 'requisitos'})",
            puntos=n * config.pesos.por_requisito,
        ))

    historial = _historial(usuario, s.id, config, hoy)
    if historial:
        puntos = config.pesos.realizado_reciente if historial.situacion == "RECIENTE" else 0
        texto = _TEXTO_HISTORIAL[historial.situacion].format(radicado=historial.radicado, fecha=historial.fecha)
        razones.append(Razon(tipo="historial", texto=texto, puntos=puntos))

    positivas = [r for r in razones if r.puntos > 0 and r.tipo != "especificidad"]
    principal = max(positivas, key=lambda r: r.puntos, default=None)
    apto = s.estado == EstadoServicio.APTO
    return Prioridad(
        puntaje=sum(r.puntos for r in razones),
        urgente=urgente and apto,
        razon_principal=principal.texto if principal else None,
        razones=sorted(razones, key=lambda r: -r.puntos),
        historial=historial,
    )


# --- 4. Desbloqueables --------------------------------------------------------------
def _desbloqueo(
    usuario: Usuario,
    s: ServicioEvaluado,
    por_id: dict[str, ServicioEvaluado],
    config: ConfigPerfilamiento,
) -> Optional[list[PasoDesbloqueo]]:
    if s.estado != EstadoServicio.NO_APTO:
        return None
    pasos = []
    for req in (r for r in s.requisitos if not r.cumple):
        accion = config.acciones.get(req.tipo)
        if accion is None or not _cumple(usuario, accion.solo_si):
            return None  # hay al menos un requisito que el ciudadano no puede resolver
        destino = next(
            (por_id[i] for i in accion.servicios if i in por_id and por_id[i].estado == EstadoServicio.APTO),
            None,
        )
        pasos.append(PasoDesbloqueo(
            texto=accion.texto,
            detalle=req.mensaje,
            servicio_id=destino.id if destino else None,
            servicio_nombre=destino.nombre if destino else None,
        ))
    return pasos or None


# --- API pública ----------------------------------------------------------------------
def priorizar(
    usuario: Usuario,
    evaluados: list[ServicioEvaluado],
    config: Optional[ConfigPerfilamiento] = None,
    hoy: Optional[date] = None,
) -> tuple[list[Segmento], list[ServicioEvaluado]]:
    """Agrega `prioridad` a cada servicio evaluado (con las REGLAS) y devuelve los segmentos.

    La lista se devuelve en el orden original del catálogo; el orden sugerido está en
    `prioridad.posicion` (1 = primero), para que el cliente pueda alternar entre ambos.
    """
    config = config or cargar_config()
    hoy = hoy or date.today()
    segmentos = segmentar(usuario, config)
    por_id = {s.id: s for s in evaluados}
    indice = {s.id: i for i, s in enumerate(evaluados)}

    prioridad = {s.id: _puntuar(usuario, s, segmentos, config, hoy) for s in evaluados}
    for s in evaluados:
        prioridad[s.id].desbloqueo = _desbloqueo(usuario, s, por_id, config)

    def grupo(s: ServicioEvaluado) -> int:
        p = prioridad[s.id]
        if s.estado == EstadoServicio.APTO:
            ya_gestionado = p.historial and p.historial.situacion in ("EN_CURSO", "VIGENTE")
            return 1 if ya_gestionado else 0
        return 2 if p.desbloqueo else 3

    candidatos = sorted(evaluados, key=lambda s: (grupo(s), -prioridad[s.id].puntaje, indice[s.id]))

    rc = config.recomendados
    recomendados: list[ServicioEvaluado] = []
    por_categoria: Counter[str] = Counter()
    for s in candidatos:
        if len(recomendados) >= rc.limite:
            break
        if grupo(s) != 0 or prioridad[s.id].puntaje < rc.puntaje_minimo:
            continue
        if por_categoria[s.categoria] >= rc.max_por_categoria:
            continue
        recomendados.append(s)
        por_categoria[s.categoria] += 1

    ids_recomendados = {s.id for s in recomendados}
    orden = recomendados + [s for s in candidatos if s.id not in ids_recomendados]
    for posicion, s in enumerate(orden, start=1):
        prioridad[s.id].posicion = posicion
        prioridad[s.id].recomendado = s.id in ids_recomendados

    publicos = [Segmento.model_validate(seg.model_dump()) for seg in segmentos]
    return publicos, [s.model_copy(update={"prioridad": prioridad[s.id]}) for s in evaluados]


def recomendar(
    usuario: Usuario,
    evaluados: list[ServicioEvaluado],
    config: Optional[ConfigPerfilamiento] = None,
    hoy: Optional[date] = None,
    limite_desbloqueables: int = 3,
) -> Recomendaciones:
    segmentos, priorizados = priorizar(usuario, evaluados, config, hoy)
    en_orden = sorted(priorizados, key=lambda s: s.prioridad.posicion)
    return Recomendaciones(
        segmentos=segmentos,
        recomendados=[s for s in en_orden if s.prioridad.recomendado],
        desbloqueables=[s for s in en_orden if s.prioridad.desbloqueo][:limite_desbloqueables],
        en_seguimiento=[
            s for s in en_orden
            if s.estado == EstadoServicio.APTO
            and s.prioridad.historial
            and s.prioridad.historial.situacion in ("EN_CURSO", "VIGENTE")
        ],
    )
