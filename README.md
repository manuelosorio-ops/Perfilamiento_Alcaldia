# Portal Ciudadano · Alcaldía de Medellín (Prototipo ABAC)

Prototipo de portal de trámites con **control de acceso basado en atributos (ABAC)**: cada uno de los 20 servicios declara sus reglas en `data.json` y el backend evalúa, para el ciudadano activo, si es **APTO** o **NO_APTO** con un `motivo_rechazo` legible.

**Stack:** FastAPI + Pydantic v2 · React 18 (Vite) + Tailwind CSS v4 + Lucide React · `data.json` como base de datos simulada · (opcional) asistente IA con Azure OpenAI.

---

## 1. Puesta en marcha (≈3 minutos)

Requisitos: **Python 3.10+** y **Node.js 18+**.

### Backend (terminal 1)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

- API: http://localhost:8000
- Documentación interactiva (Swagger): http://localhost:8000/docs

### Frontend (terminal 2)

```bash
cd frontend
npm install
npm run dev
```

Abrir **http://localhost:5173**. Vite reenvía `/api/*` al backend (puerto 8000), así que no hay que configurar URLs.

> Para apuntar a otro backend: `VITE_API_URL=http://mi-servidor:8000 npm run dev`.

### IA con Azure OpenAI (opcional): motor híbrido + asistente

Cree `backend/.env` a partir de la plantilla y pegue su clave:

```bash
cp backend/.env.example backend/.env   # luego edite AZURE_OPENAI_API_KEY
```

Con eso se activan los modos **IA** e **Híbrido** del catálogo (sección 7) y el **Asistente**.

#### Asistente

Si `backend/.env` tiene las variables `AZURE_OPENAI_*` (ver `backend/.env.example`), aparece un botón **Asistente** en la esquina inferior derecha. El modelo recibe el perfil y el resultado del motor de elegibilidad, y **explica** las reglas sin decidirlas. Si las variables no están, el portal funciona igual, sin el botón.

---

## 2. Estructura del proyecto

```
Perfilamiento_Alcaldia/
├── README.md
├── .gitignore
├── backend/
│   ├── main.py            # App FastAPI: CORS, endpoints REST
│   ├── models.py          # Modelos Pydantic (dominio + respuestas)
│   ├── elegibilidad.py    # Motor ABAC: evaluadores por tipo de regla
│   ├── repositorio.py     # Persistencia JSON (lectura por petición, escritura atómica)
│   ├── asistente.py       # Cliente Azure OpenAI + chat del asistente
│   ├── clasificador_ia.py # Clasificación con GPT-4.1 y combinación híbrida
│   ├── data.json          # "Base de datos": categorías, usuarios, servicios y reglas
│   ├── requirements.txt
│   ├── .env.example       # Plantilla de credenciales
│   └── .env               # Credenciales reales (NO subir a git)
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js     # Plugin Tailwind v4 + proxy /api
    └── src/
        ├── main.jsx
        ├── App.jsx                      # Estado global, carga de datos, vistas
        ├── index.css                    # Tema institucional (tokens Tailwind)
        ├── api/client.js                # Llamadas fetch + utilidades de formato
        └── components/
            ├── layout/   Header, UserSwitcher, Tabs, Footer
            ├── profile/  CitizenProfile      (Vista 1: Ficha integral)
            ├── catalog/  ServiceCatalog, ServiceFilters, ServiceCard,
            │             StartServiceModal   (Vista 2: Catálogo)
            ├── assistant/AssistantPanel      (chat IA opcional)
            └── ui/       Badge, Icon, Toast
```

---

## 3. Esquema de `data.json`

```jsonc
{
  "categorias": [{ "id": "hacienda", "nombre": "Catastro y Hacienda", "icono": "Landmark" }],
  "usuarios": [{
    "id": 1, "nombre": "Juan Pérez", "tipo_documento": "CC", "documento": "1001234567",
    "edad": 20, "ocupacion": "Estudiante universitario",
    "estrato": 2,                       // 1..6
    "sisben_grupo": "A1",               // A1..D21 | null
    "regimen_salud": "SUBSIDIADO",      // SUBSIDIADO | CONTRIBUTIVO | ESPECIAL
    "comuna": "...", "barrio": "...", "direccion": "...", "correo": "...", "telefono": "...",
    "estudiante": true, "pensionado": false, "discapacidad": false, "registro_mercantil": false,
    "licencia_conduccion": { "numero": "...", "categoria": "B1", "vigencia": "2031-03-15" } | null,
    "predios":   [{ "matricula", "direccion", "comuna", "tipo", "destino", "avaluo_catastral", "vis", "predial_al_dia" }],
    "vehiculos": [{ "placa", "tipo", "marca", "modelo", "soat_vigente", "tecnomecanica_vigente" }],
    "multas":    [{ "id", "tipo": "FOTOMULTA|COMPARENDO_TRANSITO|CONVIVENCIA", "descripcion", "valor", "fecha", "estado": "PENDIENTE|PAGADA" }],
    "tramites_recientes": [{ "radicado", "servicio_id", "servicio_nombre", "fecha", "estado" }]
  }],
  "servicios": [{
    "id": "HAC-03", "nombre": "Paz y Salvo Municipal", "categoria": "hacienda", "icono": "BadgeCheck",
    "descripcion": "...", "entidad": "...", "tiempo_respuesta": "...", "costo": "...",
    "reglas": [                                   // AND lógico entre reglas
      { "tipo": "min_predios", "valor": 1 },
      { "tipo": "sin_multas_pendientes", "mensaje": "Mensaje personalizado opcional" }
    ]
  }]
}
```

### Tipos de regla soportados

| Tipo | `valor` | Ejemplo de motivo de rechazo |
|---|---|---|
| `min_edad` / `max_edad` | número | "Exclusivo para personas mayores de 60 años" |
| `estratos` | lista `[1,2,3]` | "Exclusivo para estratos 1, 2 y 3 (su estrato: 5)" |
| `sisben_grupos` | lista `["A","B"]` | "Requiere clasificación Sisbén A o B (actual: sin clasificación)" |
| `regimen_salud` | lista | "Requiere estar en el régimen subsidiado…" |
| `min_predios` / `min_vehiculos` | número | "Requiere tener al menos 1 predio registrado a su nombre" |
| `sin_multas_pendientes` | tipos de multa (opcional) | "Tiene 1 multa(s) pendiente(s) por $580.000 COP" |
| `con_multas_pendientes` | tipos de multa | "No registra comparendos de tránsito pendientes…" |
| `requiere_estudiante`, `requiere_licencia`, `requiere_registro_mercantil`, `requiere_discapacidad` | — | "Exclusivo para estudiantes con matrícula vigente" |
| `cualquiera` | sub-`reglas` (OR lógico) | "Requiere ser propietario de un predio o tener registro mercantil" |

Cualquier regla acepta `mensaje` y `descripcion` para personalizar los textos. Para añadir un tipo nuevo, registre una función en `EVALUADORES` (`elegibilidad.py`).

---

## 4. Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/usuarios` | Lista resumida de los 5 ciudadanos de prueba |
| GET | `/api/usuarios/{id}` | Perfil completo + `indicadores` (multas, predios, servicios aptos…) |
| GET | `/api/usuarios/{id}/servicios?categoria=&estado=` | Catálogo evaluado solo con reglas (`estado`, `motivo_rechazo`, `requisitos[]`) |
| GET | `/api/usuarios/{id}/clasificacion?motor=reglas\|ia\|hibrido` | Catálogo evaluado con el motor elegido + comparación reglas vs. IA |
| POST | `/api/usuarios/{id}/servicios/{servicio_id}/iniciar?motor=` | Re-valida con reglas y radica (201) o rechaza (403); con IA en desacuerdo queda `EN_REVISION` |
| GET | `/api/categorias` | Categorías del catálogo |
| POST | `/api/usuarios/{id}/asistente` | Chat IA (503 si no está configurado) |
| POST | `/api/demo/restablecer` | Restaura `data.json` desde `data.seed.json` |
| GET | `/api/salud` | Estado del API y del asistente |

Ejemplo:

```bash
curl "http://localhost:8000/api/usuarios/5/servicios?estado=NO_APTO"
curl -X POST http://localhost:8000/api/usuarios/1/servicios/HAC-01/iniciar   # 403: Juan no tiene predios
```

---

## 5. Matriz de elegibilidad resultante

| Servicio | Juan | María | Carlos | Ana | Pedro |
|---|:-:|:-:|:-:|:-:|:-:|
| HAC-01 Pago Predial | ✗ | ✓ | ✗ | ✓ | ✓ |
| HAC-02 Certificado Tradición Catastral | ✗ | ✓ | ✗ | ✓ | ✓ |
| HAC-03 Paz y Salvo (predio + sin multas) | ✗ | ✗ | ✗ | ✓ | ✗ |
| HAC-04 Revisión de Avalúo | ✗ | ✓ | ✗ | ✓ | ✓ |
| MOV-01 Fotomultas (vehículo) | ✗ | ✓ | ✓ | ✗ | ✗ |
| MOV-02 Pico y Placa Solidario (vehículo + sin comparendos) | ✗ | ✗ | ✓ | ✗ | ✗ |
| MOV-03 Duplicado Licencia | ✗ | ✓ | ✓ | ✗ | ✓ |
| MOV-04 Acuerdo de Pago (comparendos tránsito) | ✗ | ✓ | ✗ | ✗ | ✗ |
| SOC-01 Becas Sapiencia (estrato 1-3, 16-35 años) | ✓ | ✗ | ✓ | ✗ | ✗ |
| SOC-02 Subsidio Adulto Mayor (60+, Sisbén A-C) | ✗ | ✗ | ✗ | ✓ | ✗ |
| SOC-03 Subsidio Nutricional (Sisbén A/B) | ✓ | ✗ | ✗ | ✓ | ✗ |
| SOC-04 Metro Estudiantil (estudiante, estrato 1-3) | ✓ | ✗ | ✗ | ✗ | ✗ |
| SAL-01 MetroSalud (régimen subsidiado) | ✓ | ✗ | ✗ | ✓ | ✗ |
| SAL-02 Encuesta Sisbén IV | ✓ | ✓ | ✓ | ✓ | ✓ |
| SAL-03 Esterilización (estrato 1-3) | ✓ | ✗ | ✓ | ✓ | ✗ |
| SAL-04 Certificado Discapacidad | ✓ | ✓ | ✓ | ✓ | ✓ |
| PLA-01 Uso de Suelo (predio **o** registro mercantil) | ✗ | ✓ | ✓ | ✓ | ✓ |
| PLA-02 PQRSD | ✓ | ✓ | ✓ | ✓ | ✓ |
| PLA-03 Certificado de Residencia (18+) | ✓ | ✓ | ✓ | ✓ | ✓ |
| PLA-04 Reporte de Daños en Vía | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Total aptos** | **10** | **12** | **11** | **14** | **10** |

---

## 6. Notas de diseño

- **La autorización vive en el servidor.** La UI deshabilita botones, pero `POST …/iniciar` vuelve a evaluar las reglas y responde 403 si no aplica.
- **Reglas declarativas.** Cambiar requisitos = editar `data.json`; el repositorio relee el archivo en cada petición, no hace falta reiniciar.
- **Persistencia simulada.** Los trámites radicados se guardan en `data.json`. El botón *Restablecer datos de demo* (pie de página) vuelve al estado inicial.
- **Emblema genérico.** No se usa el escudo oficial; el portal se identifica como prototipo con datos ficticios.

---

## 7. Motor híbrido: reglas + GPT-4.1

En el catálogo hay un selector **Motor de clasificación**:

| Modo | Quién decide | Para qué sirve |
|---|---|---|
| **Reglas** | Python (`elegibilidad.py`) | Determinístico, auditable, sin costo. Es el modo por defecto. |
| **IA** | GPT-4.1 | Ver cómo clasifica el modelo por sí solo, interpretando los requisitos en lenguaje natural. |
| **Híbrido** | Ambos | Producción: las reglas niegan con autoridad y la IA marca casos dudosos para revisión humana. |

**Cómo funciona `clasificador_ia.py`:**

1. Envía al modelo **una sola petición por ciudadano** con su perfil y los 20 servicios, cuyos requisitos van **en texto**. Por ejemplo: *"Ser propietario de un predio o tener registro mercantil"*.
2. El modelo **no ve** el resultado de las reglas: evalúa a ciegas, así la comparación es independiente.
3. Responde en JSON (`response_format=json_object`, `temperature=0`) con `estado`, `motivo` y `confianza` por servicio. Se valida con Pydantic y, si falta algún servicio, se considera error.
4. El resultado queda en caché en memoria por perfil, de modo que cambiar de pestaña o de filtro no vuelve a llamar al modelo.

**Matriz de decisión en modo híbrido:**

| Reglas | IA | Resultado |
|---|---|---|
| APTO | APTO | **APTO** |
| APTO | NO_APTO | **REQUIERE_REVISION**: se puede radicar, pero queda `EN_REVISION` |
| NO_APTO | cualquiera | **NO_APTO**: la IA nunca habilita lo que la normativa niega |

**Salvaguardas:**

- El endpoint `…/iniciar` **siempre** valida con reglas. Aunque en modo IA el modelo marque "apto", si las reglas no lo permiten responde 403.
- Si Azure falla (red, cuota, credenciales o JSON inválido), el catálogo **se degrada a reglas** y muestra un aviso con el error.
- Cada tarjeta muestra la decisión de la IA, su confianza y si coincide con las reglas. El encabezado resume cuántas coincidencias hubo, por ejemplo *"coincide en 18 de 20"*.
