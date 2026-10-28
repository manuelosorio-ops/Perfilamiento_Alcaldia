#!/usr/bin/env bash
# Levanta backend (FastAPI :8000) y frontend (Vite :5173) con un solo comando.
#   ./dev.sh            → instala lo que falte, arranca ambos y abre el navegador
#   NO_ABRIR=1 ./dev.sh → igual, sin abrir el navegador
# Ctrl+C detiene los dos. Compatible con el bash 3.2 que trae macOS.
set -eo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACK="$RAIZ/backend"
FRONT="$RAIZ/frontend"
PY="${PYTHON:-python3}"
PUERTO_API=8000
PUERTO_WEB=5173

info()  { printf "\033[1;32m▸ %s\033[0m\n" "$*"; }
aviso() { printf "\033[1;33m! %s\033[0m\n" "$*"; }
error() { printf "\033[1;31m✗ %s\033[0m\n" "$*" >&2; exit 1; }

command -v "$PY" >/dev/null || error "No se encontró $PY. Instale Python 3.10+."
command -v npm  >/dev/null || error "No se encontró npm. Instale Node.js 18+."

if command -v lsof >/dev/null; then
  for p in $PUERTO_API $PUERTO_WEB; do
    lsof -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1 && error "El puerto $p ya está en uso. Cierre la otra instancia y reintente."
  done
fi

# --- Backend: entorno virtual + dependencias (solo si cambió requirements.txt) ---
if [ ! -x "$BACK/.venv/bin/python" ]; then
  info "Creando entorno virtual de Python…"
  "$PY" -m venv "$BACK/.venv"
fi
VPY="$BACK/.venv/bin/python"
HUELLA_REQ=$("$VPY" -c "import hashlib,sys;print(hashlib.md5(open(sys.argv[1],'rb').read()).hexdigest())" "$BACK/requirements.txt")
if [ "$(cat "$BACK/.venv/.requirements.md5" 2>/dev/null)" != "$HUELLA_REQ" ]; then
  info "Instalando dependencias del backend…"
  "$VPY" -m pip install -q --upgrade pip
  "$VPY" -m pip install -q -r "$BACK/requirements.txt"
  echo "$HUELLA_REQ" > "$BACK/.venv/.requirements.md5"
fi

# --- Frontend: node_modules (solo si falta o cambió package-lock.json) ---
if [ ! -d "$FRONT/node_modules" ] || [ "$FRONT/package-lock.json" -nt "$FRONT/node_modules/.package-lock.json" ]; then
  info "Instalando dependencias del frontend…"
  (cd "$FRONT" && npm install --no-fund --no-audit)
fi

if [ -f "$BACK/.env" ]; then
  info "Azure OpenAI configurado: modo IA disponible."
else
  aviso "Sin backend/.env: la IA queda desactivada y el catálogo usa el motor de reglas."
  aviso "Para activarla: cp backend/.env.example backend/.env (y pegue su API key)."
fi

# --- Arranque de ambos procesos con logs etiquetados ---
etiqueta() { while IFS= read -r linea; do printf '%s%s\n' "$1" "$linea"; done; }

API_PID=""; WEB_PID=""
detener() {
  trap - INT TERM EXIT
  echo
  info "Deteniendo…"
  [ -n "$WEB_PID" ] && kill "$WEB_PID" 2>/dev/null || true
  [ -n "$API_PID" ] && kill "$API_PID" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap detener EXIT
trap 'exit 130' INT TERM   # Ctrl+C → sale y el trap EXIT detiene ambos procesos

(cd "$BACK" && PYTHONUNBUFFERED=1 exec "$VPY" -m uvicorn main:app --reload --port "$PUERTO_API") \
  > >(etiqueta $'\033[36m[api]\033[0m ') 2>&1 &
API_PID=$!

(cd "$FRONT" && exec "$FRONT/node_modules/.bin/vite" --port "$PUERTO_WEB" --strictPort) \
  > >(etiqueta $'\033[35m[web]\033[0m ') 2>&1 &
WEB_PID=$!

# Espera a que ambos respondan (máx. ~30 s) y abre el navegador.
for _ in $(seq 1 60); do
  if curl -fs "http://localhost:$PUERTO_API/api/salud" >/dev/null 2>&1 && curl -fs "http://localhost:$PUERTO_WEB" >/dev/null 2>&1; then
    info "Listo →  App: http://localhost:$PUERTO_WEB   ·   API: http://localhost:$PUERTO_API/docs   ·   Ctrl+C para salir"
    if [ -z "$NO_ABRIR" ] && command -v open >/dev/null; then open "http://localhost:$PUERTO_WEB"; fi
    break
  fi
  kill -0 "$API_PID" 2>/dev/null && kill -0 "$WEB_PID" 2>/dev/null || break
  sleep 0.5
done

# Si cualquiera de los dos se cae, se detiene el otro.
while kill -0 "$API_PID" 2>/dev/null && kill -0 "$WEB_PID" 2>/dev/null; do sleep 1; done
sleep 0.5  # si fue Ctrl+C, el trap sale aquí y no se muestra el aviso
aviso "Uno de los procesos terminó; deteniendo el otro."
