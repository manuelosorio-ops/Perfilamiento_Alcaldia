"""API REST del Portal Ciudadano – Alcaldía de Medellín (prototipo ABAC).

Ejecutar:  uvicorn main:app --reload --port 8000
Docs:      http://localhost:8000/docs
"""
from __future__ import annotations

import logging
import random
from datetime import date
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()  # carga backend/.env (credenciales opcionales de Azure OpenAI)

import asistente  # noqa: E402
import clasificador_ia  # noqa: E402
import priorizacion  # noqa: E402
from elegibilidad import evaluar_catalogo, evaluar_servicio  # noqa: E402
from models import (  # noqa: E402
    Categoria,
    Clasificacion,
    Motor,
    EstadoServicio,
    Indicadores,
    Recomendaciones,
    RespuestaAsistente,
    ServicioEvaluado,
    SolicitudAsistente,
    TramiteIniciado,
    TramiteReciente,
    Usuario,
    UsuarioDetalle,
    UsuarioResumen,
)
from repositorio import repo  # noqa: E402

log = logging.getLogger("portal")

app = FastAPI(
    title="Portal Ciudadano – Alcaldía de Medellín (Prototipo)",
    description="Catálogo de trámites con control de acceso basado en atributos (ABAC).",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _usuario_o_404(usuario_id: int) -> Usuario:
    usuario = repo.obtener_usuario(usuario_id)
    if usuario is None:
        raise HTTPException(status_code=404, detail=f"Usuario {usuario_id} no encontrado")
    return usuario


def _priorizar(usuario: Usuario, evaluados: list[ServicioEvaluado]) -> list[ServicioEvaluado]:
    """Agrega la prioridad al catálogo. Si perfilamiento.json falla, el catálogo sigue
    funcionando sin orden sugerido: la elegibilidad nunca depende de la priorización."""
    try:
        return priorizacion.priorizar(usuario, evaluados)[1]
    except Exception as exc:  # archivo ausente, JSON inválido o regla desconocida
        log.warning("Priorización no disponible: %s", exc)
        return evaluados


# ---------------------------------------------------------------------------
# Usuarios
# ---------------------------------------------------------------------------
@app.get("/api/usuarios", response_model=list[UsuarioResumen], tags=["Usuarios"])
def listar_usuarios():
    return [UsuarioResumen.model_validate(u.model_dump()) for u in repo.listar_usuarios()]


@app.get("/api/usuarios/{usuario_id}", response_model=UsuarioDetalle, tags=["Usuarios"])
def obtener_usuario(usuario_id: int):
    usuario = _usuario_o_404(usuario_id)
    evaluados = evaluar_catalogo(usuario, repo.listar_servicios())
    pendientes = usuario.multas_pendientes
    return UsuarioDetalle(
        **usuario.model_dump(),
        indicadores=Indicadores(
            adulto_mayor=usuario.adulto_mayor,
            total_predios=len(usuario.predios),
            total_vehiculos=len(usuario.vehiculos),
            multas_pendientes=len(pendientes),
            valor_multas_pendientes=sum(m.valor for m in pendientes),
            servicios_aptos=sum(s.estado == EstadoServicio.APTO for s in evaluados),
            servicios_total=len(evaluados),
        ),
    )


# ---------------------------------------------------------------------------
# Catálogo y elegibilidad
# ---------------------------------------------------------------------------
@app.get("/api/categorias", response_model=list[Categoria], tags=["Catálogo"])
def listar_categorias():
    return repo.listar_categorias()


@app.get("/api/usuarios/{usuario_id}/servicios", response_model=list[ServicioEvaluado], tags=["Catálogo"])
def servicios_del_usuario(
    usuario_id: int,
    categoria: Optional[str] = Query(None, description="Filtra por id de categoría"),
    estado: Optional[EstadoServicio] = Query(None, description="APTO o NO_APTO"),
):
    usuario = _usuario_o_404(usuario_id)
    # Se prioriza sobre el catálogo completo para que la posición no dependa del filtro.
    evaluados = _priorizar(usuario, evaluar_catalogo(usuario, repo.listar_servicios()))
    if categoria:
        evaluados = [s for s in evaluados if s.categoria == categoria]
    if estado:
        evaluados = [s for s in evaluados if s.estado == estado]
    return evaluados


@app.get("/api/usuarios/{usuario_id}/clasificacion", response_model=Clasificacion, tags=["Catálogo"])
def clasificar_servicios(usuario_id: int, motor: Motor = Query(Motor.REGLAS, description="reglas | ia | hibrido")):
    """Catálogo evaluado con el motor elegido. Si la IA falla, se degrada a reglas e informa el error."""
    usuario = _usuario_o_404(usuario_id)
    por_reglas = _priorizar(usuario, evaluar_catalogo(usuario, repo.listar_servicios()))

    ia, ia_error = {}, None
    if motor != Motor.REGLAS:
        try:
            ia = clasificador_ia.clasificar(usuario, por_reglas)
        except clasificador_ia.ErrorIA as exc:
            ia_error = str(exc)

    motor_efectivo = motor if ia else Motor.REGLAS
    servicios = [clasificador_ia.combinar(motor_efectivo, s, ia.get(s.id)) for s in por_reglas]
    return Clasificacion(
        motor=motor_efectivo,
        ia_disponible=asistente.configurado(),
        ia_error=ia_error,
        modelo=clasificador_ia.nombre_modelo() if ia else None,
        coincidencias=sum(bool(s.coincide) for s in servicios) if ia else None,
        servicios=servicios,
    )


@app.get("/api/usuarios/{usuario_id}/recomendaciones", response_model=Recomendaciones, tags=["Catálogo"])
def recomendaciones(usuario_id: int):
    """Segmentos del ciudadano, trámites sugeridos (en orden), trámites que puede habilitar
    y trámites que ya tiene en curso. Calculado con reglas: determinístico y explicable."""
    usuario = _usuario_o_404(usuario_id)
    evaluados = evaluar_catalogo(usuario, repo.listar_servicios())
    try:
        return priorizacion.recomendar(usuario, evaluados)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error en perfilamiento.json: {exc}") from exc


@app.post(
    "/api/usuarios/{usuario_id}/servicios/{servicio_id}/iniciar",
    response_model=TramiteIniciado,
    status_code=201,
    tags=["Catálogo"],
)
def iniciar_tramite(usuario_id: int, servicio_id: str, motor: Motor = Query(Motor.REGLAS)):
    usuario = _usuario_o_404(usuario_id)
    servicio = repo.obtener_servicio(servicio_id)
    if servicio is None:
        raise HTTPException(status_code=404, detail=f"Servicio {servicio_id} no encontrado")

    # La autorización se re-valida en el servidor con las REGLAS, sea cual sea el motor:
    # la IA nunca puede habilitar algo que la normativa niega.
    evaluado = evaluar_servicio(usuario, servicio)
    if evaluado.estado == EstadoServicio.NO_APTO:
        raise HTTPException(
            status_code=403,
            detail={"mensaje": "El ciudadano no cumple los requisitos", "motivo_rechazo": evaluado.motivo_rechazo},
        )

    # Con IA activa: si el modelo discrepa, se radica igual pero queda para revisión manual.
    estado, mensaje = "RADICADO", f"Su solicitud fue radicada ante {servicio.entidad}. Tiempo estimado: {servicio.tiempo_respuesta}."
    if motor != Motor.REGLAS:
        try:
            ia = clasificador_ia.clasificar(usuario, evaluar_catalogo(usuario, repo.listar_servicios())).get(servicio.id)
        except clasificador_ia.ErrorIA:
            ia = None
        if ia and ia.estado == "NO_APTO":
            estado = "EN_REVISION"
            mensaje = f"Su solicitud fue radicada y pasará a revisión manual en {servicio.entidad}: {ia.motivo}"

    tramite = TramiteReciente(
        radicado=f"MED-{date.today().year}-{random.randint(100000, 999999)}",
        servicio_id=servicio.id,
        servicio_nombre=servicio.nombre,
        fecha=date.today().isoformat(),
        estado=estado,
    )
    repo.registrar_tramite(usuario.id, tramite)
    return TramiteIniciado(**tramite.model_dump(), mensaje=mensaje)


# ---------------------------------------------------------------------------
# Utilidades de demo
# ---------------------------------------------------------------------------
@app.post("/api/demo/restablecer", status_code=204, tags=["Demo"])
def restablecer_datos():
    """Restaura data.json al estado inicial (data.seed.json)."""
    repo.restablecer()


@app.get("/api/salud", tags=["Demo"])
def salud():
    return {"ok": True, "asistente_ia": asistente.configurado()}


# ---------------------------------------------------------------------------
# Asistente IA (opcional)
# ---------------------------------------------------------------------------
@app.post("/api/usuarios/{usuario_id}/asistente", response_model=RespuestaAsistente, tags=["Asistente IA"])
def preguntar_asistente(usuario_id: int, solicitud: SolicitudAsistente):
    if not asistente.configurado():
        raise HTTPException(status_code=503, detail="Asistente IA no configurado (ver backend/.env)")
    usuario = _usuario_o_404(usuario_id)
    evaluados = evaluar_catalogo(usuario, repo.listar_servicios())
    try:
        texto = asistente.responder(usuario, evaluados, solicitud.historial, solicitud.mensaje)
    except Exception as exc:  # error de red / credenciales / cuota
        raise HTTPException(status_code=502, detail=f"Error consultando Azure OpenAI: {exc}") from exc
    return RespuestaAsistente(respuesta=texto)
