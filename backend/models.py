"""Modelos Pydantic del portal (dominio + respuestas de la API)."""
from __future__ import annotations

from enum import Enum
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Dominio: ciudadano
# ---------------------------------------------------------------------------
class Predio(BaseModel):
    matricula: str
    direccion: str
    comuna: str
    tipo: str
    destino: str
    avaluo_catastral: int
    vis: bool = False
    predial_al_dia: bool = True


class Vehiculo(BaseModel):
    placa: str
    tipo: str
    marca: str
    modelo: int
    soat_vigente: bool = True
    tecnomecanica_vigente: bool = True


class Licencia(BaseModel):
    numero: str
    categoria: str
    vigencia: str


TipoMulta = Literal["FOTOMULTA", "COMPARENDO_TRANSITO", "CONVIVENCIA"]


class Multa(BaseModel):
    id: str
    tipo: TipoMulta
    descripcion: str
    valor: int
    fecha: str
    estado: Literal["PENDIENTE", "PAGADA"] = "PENDIENTE"


class TramiteReciente(BaseModel):
    radicado: str
    servicio_id: str
    servicio_nombre: str
    fecha: str
    estado: str


class Usuario(BaseModel):
    id: int
    nombre: str
    tipo_documento: str
    documento: str
    edad: int
    ocupacion: str
    estrato: int = Field(ge=1, le=6)
    sisben_grupo: Optional[str] = None  # A1..A5, B1..B7, C1..C18, D1..D21
    regimen_salud: Literal["SUBSIDIADO", "CONTRIBUTIVO", "ESPECIAL"]
    comuna: str
    barrio: str
    direccion: str
    correo: str
    telefono: str
    estudiante: bool = False
    pensionado: bool = False
    discapacidad: bool = False
    registro_mercantil: bool = False
    licencia_conduccion: Optional[Licencia] = None
    predios: list[Predio] = []
    vehiculos: list[Vehiculo] = []
    multas: list[Multa] = []
    tramites_recientes: list[TramiteReciente] = []

    # Atributos derivados (usados por el motor ABAC y la UI)
    @property
    def adulto_mayor(self) -> bool:
        return self.edad >= 60

    @property
    def multas_pendientes(self) -> list[Multa]:
        return [m for m in self.multas if m.estado == "PENDIENTE"]


class UsuarioResumen(BaseModel):
    id: int
    nombre: str
    edad: int
    ocupacion: str
    estrato: int
    sisben_grupo: Optional[str]


class Indicadores(BaseModel):
    adulto_mayor: bool
    total_predios: int
    total_vehiculos: int
    multas_pendientes: int
    valor_multas_pendientes: int
    servicios_aptos: int
    servicios_total: int


class UsuarioDetalle(Usuario):
    indicadores: Indicadores


# ---------------------------------------------------------------------------
# Dominio: catálogo y reglas
# ---------------------------------------------------------------------------
class Regla(BaseModel):
    """Regla declarativa evaluada por el motor de elegibilidad (ver elegibilidad.py)."""

    tipo: str
    valor: Any = None
    mensaje: Optional[str] = None       # sobreescribe el motivo de rechazo por defecto
    descripcion: Optional[str] = None   # sobreescribe la etiqueta del requisito
    reglas: list["Regla"] = []          # solo para tipo "cualquiera" (OR lógico)


class Categoria(BaseModel):
    id: str
    nombre: str
    icono: str


class Servicio(BaseModel):
    id: str
    nombre: str
    categoria: str
    icono: str
    descripcion: str
    entidad: str
    tiempo_respuesta: str
    costo: str
    reglas: list[Regla] = []


class EstadoServicio(str, Enum):
    APTO = "APTO"
    NO_APTO = "NO_APTO"
    REQUIERE_REVISION = "REQUIERE_REVISION"  # solo en modo híbrido: reglas e IA no coinciden


class Motor(str, Enum):
    REGLAS = "reglas"     # motor determinístico en Python (fuente de verdad)
    IA = "ia"             # clasificación hecha por el modelo (GPT-4.1)
    HIBRIDO = "hibrido"   # ambos; las reglas mandan y la IA marca casos para revisión


class EvaluacionIA(BaseModel):
    id: str
    estado: Literal["APTO", "NO_APTO"]
    motivo: Optional[str] = None
    confianza: float = Field(ge=0, le=1)


class RequisitoEvaluado(BaseModel):
    tipo: str
    descripcion: str
    cumple: bool
    mensaje: Optional[str] = None


class ServicioEvaluado(BaseModel):
    id: str
    nombre: str
    categoria: str
    icono: str
    descripcion: str
    entidad: str
    tiempo_respuesta: str
    costo: str
    estado: EstadoServicio
    motivo_rechazo: Optional[str] = None
    requisitos: list[RequisitoEvaluado]
    # Trazabilidad del motor híbrido
    estado_reglas: Optional[EstadoServicio] = None
    evaluacion_ia: Optional[EvaluacionIA] = None
    coincide: Optional[bool] = None


class Clasificacion(BaseModel):
    motor: Motor
    ia_disponible: bool
    ia_error: Optional[str] = None
    modelo: Optional[str] = None
    coincidencias: Optional[int] = None
    servicios: list[ServicioEvaluado]


class TramiteIniciado(BaseModel):
    radicado: str
    servicio_id: str
    servicio_nombre: str
    fecha: str
    estado: str
    mensaje: str


# ---------------------------------------------------------------------------
# Asistente IA (opcional, Azure OpenAI)
# ---------------------------------------------------------------------------
class MensajeChat(BaseModel):
    rol: Literal["user", "assistant"]
    contenido: str


class SolicitudAsistente(BaseModel):
    mensaje: str = Field(min_length=1, max_length=2000)
    historial: list[MensajeChat] = []


class RespuestaAsistente(BaseModel):
    respuesta: str
