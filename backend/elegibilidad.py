"""Motor de elegibilidad ABAC.

Cada servicio declara en data.json una lista de reglas (AND lógico). Cada regla se
evalúa contra los atributos del ciudadano y produce un RequisitoEvaluado con una
descripción legible y, si no se cumple, un motivo de rechazo amigable.

Para añadir un nuevo tipo de regla basta con registrar una función en EVALUADORES.
"""
from __future__ import annotations

from typing import Callable

from models import (
    EstadoServicio,
    Regla,
    RequisitoEvaluado,
    Servicio,
    ServicioEvaluado,
    Usuario,
)

Resultado = tuple[bool, str, str]  # (cumple, descripción del requisito, motivo si no cumple)


def _enumerar(items: list, conector: str = "y") -> str:
    items = [str(i) for i in items]
    if len(items) <= 1:
        return "".join(items)
    return f"{', '.join(items[:-1])} {conector} {items[-1]}"


def _plural(n: int, singular: str, plural: str) -> str:
    return singular if n == 1 else plural


# --- Evaluadores por tipo de regla -----------------------------------------
def _min_edad(u: Usuario, r: Regla) -> Resultado:
    return (u.edad >= r.valor, f"Edad mínima: {r.valor} años",
            f"Requiere tener {r.valor} años o más (edad actual: {u.edad})")


def _max_edad(u: Usuario, r: Regla) -> Resultado:
    return (u.edad <= r.valor, f"Edad máxima: {r.valor} años",
            f"Disponible solo hasta los {r.valor} años (edad actual: {u.edad})")


def _estratos(u: Usuario, r: Regla) -> Resultado:
    lista = _enumerar(r.valor)
    return (u.estrato in r.valor, f"Estrato {lista}",
            f"Exclusivo para estratos {lista} (su estrato: {u.estrato})")


def _sisben_grupos(u: Usuario, r: Regla) -> Resultado:
    grupos = _enumerar(r.valor, "o")
    cumple = bool(u.sisben_grupo) and u.sisben_grupo[0].upper() in r.valor
    actual = u.sisben_grupo or "sin clasificación"
    return (cumple, f"Sisbén grupo {grupos}",
            f"Requiere clasificación Sisbén {grupos} (actual: {actual})")


def _regimen_salud(u: Usuario, r: Regla) -> Resultado:
    lista = _enumerar([v.lower() for v in r.valor], "o")
    return (u.regimen_salud in r.valor, f"Régimen de salud {lista}",
            f"Requiere estar en el régimen {lista} (actual: {u.regimen_salud.lower()})")


def _min_predios(u: Usuario, r: Regla) -> Resultado:
    n = r.valor or 1
    return (len(u.predios) >= n,
            f"Al menos {n} {_plural(n, 'predio', 'predios')} a su nombre",
            f"Requiere tener al menos {n} {_plural(n, 'predio registrado', 'predios registrados')} a su nombre")


def _min_vehiculos(u: Usuario, r: Regla) -> Resultado:
    n = r.valor or 1
    return (len(u.vehiculos) >= n,
            f"Al menos {n} {_plural(n, 'vehículo', 'vehículos')} registrado(s)",
            "Requiere tener un vehículo registrado a su nombre en el RUNT")


def _multas(u: Usuario, r: Regla) -> list:
    tipos = r.valor or None
    return [m for m in u.multas_pendientes if tipos is None or m.tipo in tipos]


def _sin_multas_pendientes(u: Usuario, r: Regla) -> Resultado:
    pendientes = _multas(u, r)
    total = sum(m.valor for m in pendientes)
    return (not pendientes, "Sin multas ni comparendos pendientes",
            f"Tiene {len(pendientes)} multa(s) pendiente(s) por ${total:,.0f} COP".replace(",", "."))


def _con_multas_pendientes(u: Usuario, r: Regla) -> Resultado:
    return (bool(_multas(u, r)), "Tener comparendos de tránsito pendientes",
            "No registra comparendos de tránsito pendientes para acordar un plan de pago")


def _requiere_estudiante(u: Usuario, r: Regla) -> Resultado:
    return (u.estudiante, "Ser estudiante activo", "Exclusivo para estudiantes con matrícula vigente")


def _requiere_licencia(u: Usuario, r: Regla) -> Resultado:
    return (u.licencia_conduccion is not None, "Tener licencia de conducción expedida",
            "No registra licencia de conducción expedida en el RUNT")


def _requiere_registro_mercantil(u: Usuario, r: Regla) -> Resultado:
    return (u.registro_mercantil, "Tener registro mercantil vigente",
            "Requiere un registro mercantil vigente (Cámara de Comercio)")


def _requiere_discapacidad(u: Usuario, r: Regla) -> Resultado:
    return (u.discapacidad, "Persona con discapacidad certificada",
            "Exclusivo para personas con discapacidad certificada")


def _cualquiera(u: Usuario, r: Regla) -> Resultado:
    """OR lógico entre sub-reglas."""
    subs = [evaluar_regla(u, s) for s in r.reglas]
    return (any(s.cumple for s in subs),
            _enumerar([s.descripcion for s in subs], "o"),
            _enumerar([s.mensaje for s in subs if s.mensaje], "o"))


EVALUADORES: dict[str, Callable[[Usuario, Regla], Resultado]] = {
    "min_edad": _min_edad,
    "max_edad": _max_edad,
    "estratos": _estratos,
    "sisben_grupos": _sisben_grupos,
    "regimen_salud": _regimen_salud,
    "min_predios": _min_predios,
    "min_vehiculos": _min_vehiculos,
    "sin_multas_pendientes": _sin_multas_pendientes,
    "con_multas_pendientes": _con_multas_pendientes,
    "requiere_estudiante": _requiere_estudiante,
    "requiere_licencia": _requiere_licencia,
    "requiere_registro_mercantil": _requiere_registro_mercantil,
    "requiere_discapacidad": _requiere_discapacidad,
    "cualquiera": _cualquiera,
}


# --- API pública del motor ---------------------------------------------------
def evaluar_regla(usuario: Usuario, regla: Regla) -> RequisitoEvaluado:
    evaluador = EVALUADORES.get(regla.tipo)
    if evaluador is None:
        raise ValueError(f"Tipo de regla desconocido: {regla.tipo}")
    cumple, descripcion, motivo = evaluador(usuario, regla)
    return RequisitoEvaluado(
        tipo=regla.tipo,
        descripcion=regla.descripcion or descripcion,
        cumple=cumple,
        mensaje=None if cumple else (regla.mensaje or motivo),
    )


def evaluar_servicio(usuario: Usuario, servicio: Servicio) -> ServicioEvaluado:
    requisitos = [evaluar_regla(usuario, r) for r in servicio.reglas]
    fallidos = [r.mensaje for r in requisitos if not r.cumple]
    return ServicioEvaluado(
        **servicio.model_dump(exclude={"reglas"}),
        estado=EstadoServicio.NO_APTO if fallidos else EstadoServicio.APTO,
        motivo_rechazo=". ".join(fallidos) if fallidos else None,
        requisitos=requisitos,
    )


def evaluar_catalogo(usuario: Usuario, servicios: list[Servicio]) -> list[ServicioEvaluado]:
    return [evaluar_servicio(usuario, s) for s in servicios]
