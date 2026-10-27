"""Clasificación de elegibilidad con Azure OpenAI (GPT-4.1) y combinación con el motor de reglas.

Modos:
  - reglas  : solo Python (elegibilidad.py).
  - ia      : el modelo decide APTO / NO_APTO leyendo el perfil y los requisitos en texto.
  - hibrido : ambos se ejecutan. Las reglas son la última palabra para NEGAR; si las reglas
              aprueban pero la IA tiene dudas, el trámite queda en REQUIERE_REVISION.

El modelo NO recibe el resultado de las reglas (evaluación a ciegas), solo el perfil del
ciudadano y los requisitos redactados en lenguaje natural, para que su juicio sea independiente
y la comparación tenga sentido.
"""
from __future__ import annotations

import hashlib
import json
import os
import threading

from asistente import _cliente, configurado
from models import EstadoServicio, EvaluacionIA, Motor, ServicioEvaluado, Usuario


class ErrorIA(Exception):
    """Fallo de red, credenciales, cuota o respuesta mal formada del modelo."""


_PROMPT_SISTEMA = """Eres un analista de elegibilidad de la Alcaldía de Medellín.
Para cada servicio recibido decide si el ciudadano es APTO o NO_APTO comparando su perfil
con los requisitos listados. Reglas de análisis:
- Usa SOLO los datos del perfil. No supongas información que no está.
- "Sisbén grupo A o B" se cumple si el campo sisben_grupo empieza por esa letra (p. ej. "B2"). null = sin Sisbén.
- Las multas cuentan solo si su estado es "PENDIENTE". Fotomultas y comparendos son de tránsito; "CONVIVENCIA" es Código de Policía.
- Un servicio con "Sin requisitos de perfil" es APTO.
- Si hay varios requisitos deben cumplirse todos, salvo que el texto diga "o".
- motivo: si es NO_APTO, una frase corta y amable para el ciudadano explicando qué le falta; si es APTO, null.
- confianza: número entre 0 y 1 sobre tu certeza.

Responde ÚNICAMENTE con JSON con esta forma:
{"resultados": [{"id": "HAC-01", "estado": "APTO" | "NO_APTO", "motivo": string | null, "confianza": number}]}
Incluye exactamente un resultado por cada servicio recibido."""

_cache: dict[str, dict[str, EvaluacionIA]] = {}
_lock = threading.Lock()


def nombre_modelo() -> str | None:
    return os.getenv("AZURE_OPENAI_DEPLOYMENT")


def _llamar_modelo(mensajes: list[dict]) -> str:
    respuesta = _cliente().chat.completions.create(
        model=os.environ["AZURE_OPENAI_DEPLOYMENT"],
        messages=mensajes,
        temperature=0,  # lo más determinístico posible
        max_completion_tokens=3000,
        response_format={"type": "json_object"},
    )
    return respuesta.choices[0].message.content or ""


def clasificar(usuario: Usuario, evaluados_reglas: list[ServicioEvaluado]) -> dict[str, EvaluacionIA]:
    """Devuelve {servicio_id: EvaluacionIA}. Una sola llamada al modelo por perfil (con caché)."""
    if not configurado():
        raise ErrorIA("Azure OpenAI no está configurado (backend/.env)")

    perfil = usuario.model_dump(exclude={"tramites_recientes"})
    perfil["adulto_mayor"] = usuario.adulto_mayor
    servicios = [
        {
            "id": s.id,
            "nombre": s.nombre,
            "descripcion": s.descripcion,
            "requisitos": [r.descripcion for r in s.requisitos] or ["Sin requisitos de perfil"],
        }
        for s in evaluados_reglas
    ]

    clave = hashlib.sha256(json.dumps([perfil, servicios], sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    with _lock:
        if clave in _cache:
            return _cache[clave]

    mensajes = [
        {"role": "system", "content": _PROMPT_SISTEMA},
        {
            "role": "user",
            "content": f"PERFIL:\n{json.dumps(perfil, ensure_ascii=False)}\n\n"
            f"SERVICIOS:\n{json.dumps(servicios, ensure_ascii=False)}",
        },
    ]
    try:
        crudo = _llamar_modelo(mensajes)
        datos = json.loads(crudo)
        resultados = {r["id"]: EvaluacionIA.model_validate(r) for r in datos["resultados"]}
    except ErrorIA:
        raise
    except Exception as exc:
        raise ErrorIA(f"{type(exc).__name__}: {exc}") from exc

    faltantes = {s["id"] for s in servicios} - resultados.keys()
    if faltantes:
        raise ErrorIA(f"El modelo no evaluó: {', '.join(sorted(faltantes))}")

    with _lock:
        _cache[clave] = resultados
    return resultados


def combinar(motor: Motor, s: ServicioEvaluado, ia: EvaluacionIA | None) -> ServicioEvaluado:
    """Fusiona el resultado de reglas con el de la IA según el motor elegido."""
    estado_reglas = s.estado
    base = s.model_copy(update={"estado_reglas": estado_reglas})
    if motor == Motor.REGLAS or ia is None:
        return base

    coincide = ia.estado == estado_reglas.value
    base = base.model_copy(update={"evaluacion_ia": ia, "coincide": coincide})

    if motor == Motor.IA:
        estado = EstadoServicio(ia.estado)
        return base.model_copy(
            update={"estado": estado, "motivo_rechazo": ia.motivo if estado == EstadoServicio.NO_APTO else None}
        )

    # HÍBRIDO: las reglas niegan con autoridad; la IA solo puede "frenar" para revisión humana.
    if estado_reglas == EstadoServicio.NO_APTO:
        return base
    if ia.estado == "NO_APTO":
        return base.model_copy(
            update={
                "estado": EstadoServicio.REQUIERE_REVISION,
                "motivo_rechazo": f"Las reglas lo habilitan, pero el análisis de IA sugiere revisión: {ia.motivo}",
            }
        )
    return base
