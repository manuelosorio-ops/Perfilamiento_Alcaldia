"""Asistente ciudadano (opcional) sobre Azure OpenAI.

Se activa solo si las variables AZURE_OPENAI_* están definidas en backend/.env.
El modelo recibe el perfil del ciudadano y el resultado del motor de elegibilidad,
de modo que explica las reglas pero nunca las decide: la fuente de verdad sigue
siendo elegibilidad.py.
"""
from __future__ import annotations

import json
import os
from functools import lru_cache

from models import MensajeChat, ServicioEvaluado, Usuario

_VARS = ("AZURE_OPENAI_ENDPOINT", "AZURE_OPENAI_API_KEY", "AZURE_OPENAI_DEPLOYMENT")


def configurado() -> bool:
    return all(os.getenv(v) for v in _VARS)


@lru_cache(maxsize=1)
def _cliente():
    from openai import AzureOpenAI  # import diferido: el backend arranca aunque no se use

    return AzureOpenAI(
        azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
        api_key=os.environ["AZURE_OPENAI_API_KEY"],
        api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview"),
    )


def _prompt_sistema(usuario: Usuario, servicios: list[ServicioEvaluado]) -> str:
    perfil = usuario.model_dump(exclude={"tramites_recientes"})
    catalogo = [
        {"id": s.id, "nombre": s.nombre, "estado": s.estado.value, "motivo_rechazo": s.motivo_rechazo}
        for s in servicios
    ]
    return (
        "Eres el asistente virtual del portal de trámites de la Alcaldía de Medellín (prototipo). "
        "Responde en español, con tono cercano e institucional, en máximo 120 palabras. "
        "Usa SOLO la información del perfil y del catálogo evaluado que aparece abajo; "
        "la elegibilidad ya fue calculada por el sistema y no debes contradecirla ni inventar requisitos, "
        "valores o fechas. Si el ciudadano no es apto, explica el motivo y sugiere alternativas aptas del catálogo. "
        "Si te preguntan algo fuera de los trámites, redirige amablemente.\n\n"
        f"PERFIL DEL CIUDADANO:\n{json.dumps(perfil, ensure_ascii=False)}\n\n"
        f"CATÁLOGO EVALUADO PARA ESTE CIUDADANO:\n{json.dumps(catalogo, ensure_ascii=False)}"
    )


def responder(
    usuario: Usuario,
    servicios: list[ServicioEvaluado],
    historial: list[MensajeChat],
    mensaje: str,
) -> str:
    mensajes = [{"role": "system", "content": _prompt_sistema(usuario, servicios)}]
    mensajes += [{"role": m.rol, "content": m.contenido} for m in historial[-10:]]
    mensajes.append({"role": "user", "content": mensaje})

    respuesta = _cliente().chat.completions.create(
        model=os.environ["AZURE_OPENAI_DEPLOYMENT"],
        messages=mensajes,
        max_completion_tokens=600,
        temperature=0.3,
    )
    return respuesta.choices[0].message.content or ""
