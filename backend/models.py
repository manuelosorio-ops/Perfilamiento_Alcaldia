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


# ---------------------------------------------------------------------------
# Perfilamiento y priorización (ver priorizacion.py y perfilamiento.json)
# ---------------------------------------------------------------------------
TipoServicio = Literal["obligacion", "beneficio", "tramite", "general"]


class Razon(BaseModel):
    """Un aporte al puntaje de un servicio. La suma de los puntos es el puntaje."""

    tipo: Literal["tipo", "impulso", "segmento", "especificidad", "historial"]
    texto: str
    puntos: int


class HistorialServicio(BaseModel):
    situacion: Literal["EN_CURSO", "VIGENTE", "RECIENTE"]
    radicado: str
    estado: str
    fecha: str


class PasoDesbloqueo(BaseModel):
    texto: str                              # qué debe hacer el ciudadano
    detalle: Optional[str] = None           # el motivo de rechazo que resuelve
    servicio_id: Optional[str] = None       # trámite apto que le ayuda a resolverlo
    servicio_nombre: Optional[str] = None


class Prioridad(BaseModel):
    puntaje: int
    posicion: int = 0                       # 1 = lo primero que se le muestra
    recomendado: bool = False
    urgente: bool = False
    razon_principal: Optional[str] = None
    razones: list[Razon] = []
    historial: Optional[HistorialServicio] = None
    desbloqueo: Optional[list[PasoDesbloqueo]] = None  # solo en NO_APTO resolubles


class Segmento(BaseModel):
    id: str
    nombre: str
    icono: str
    descripcion: str


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
    # Priorización según el perfil (None si perfilamiento.json no está disponible)
    prioridad: Optional[Prioridad] = None


class Recomendaciones(BaseModel):
    segmentos: list[Segmento]
    recomendados: list[ServicioEvaluado]      # lo que se le sugiere primero
    desbloqueables: list[ServicioEvaluado]    # NO_APTO que puede habilitar resolviendo algo
    en_seguimiento: list[ServicioEvaluado]    # aptos que ya tiene en curso o vigentes


# -- Configuración (perfilamiento.json) --------------------------------------
class SegmentoConfig(Segmento):
    reglas: list[Regla]                       # quién pertenece (AND; use "cualquiera" para OR)
    razon: str                                # texto de la sugerencia, p. ej. "Por ser estudiante"
    intereses: dict[str, int] = {}            # servicio_id -> puntos


class Impulso(BaseModel):
    reglas: list[Regla]
    puntos: int
    razon: str
    urgente: bool = False


class ServicioPrioridadConfig(BaseModel):
    tipo: TipoServicio = "tramite"
    impulsos: list[Impulso] = []


class TipoConfig(BaseModel):
    puntos: int
    razon: str


class AccionDesbloqueo(BaseModel):
    texto: str
    servicios: list[str] = []                 # trámites que ayudan a resolverlo (se usa el primero apto)
    solo_si: list[Regla] = []                 # condiciones para que la sugerencia tenga sentido


class PesosConfig(BaseModel):
    por_requisito: int = 4
    realizado_reciente: int = -50
    ventana_reciente_dias: int = 365


class RecomendadosConfig(BaseModel):
    limite: int = 4
    puntaje_minimo: int = 25
    max_por_categoria: int = 2


class HistorialConfig(BaseModel):
    en_curso: list[str] = ["RADICADO", "EN_REVISION"]
    vigente: list[str] = ["APROBADO"]
    finalizado: list[str] = ["FINALIZADO", "RESPONDIDO"]


class ConfigPerfilamiento(BaseModel):
    tipos: dict[TipoServicio, TipoConfig]
    pesos: PesosConfig = PesosConfig()
    recomendados: RecomendadosConfig = RecomendadosConfig()
    historial: HistorialConfig = HistorialConfig()
    segmentos: list[SegmentoConfig] = []
    servicios: dict[str, ServicioPrioridadConfig] = {}
    acciones: dict[str, AccionDesbloqueo] = {}


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
