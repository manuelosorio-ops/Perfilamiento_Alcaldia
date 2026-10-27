"""Persistencia simulada sobre un archivo JSON local (data.json).

- Lee el archivo en cada operación, así los cambios manuales a data.json se ven
  sin reiniciar el servidor.
- Escritura atómica (archivo temporal + os.replace) protegida con un lock.
- En el primer arranque guarda una copia semilla (data.seed.json) para poder
  restablecer el estado de la demo.
"""
from __future__ import annotations

import json
import os
import shutil
import threading
from pathlib import Path
from typing import Optional

from models import Categoria, Servicio, TramiteReciente, Usuario

BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = BASE_DIR / "data.json"
SEED_FILE = BASE_DIR / "data.seed.json"


class JsonRepository:
    def __init__(self, path: Path = DATA_FILE, seed: Path = SEED_FILE) -> None:
        self.path = path
        self.seed = seed
        self._lock = threading.RLock()
        if not self.seed.exists():
            shutil.copyfile(self.path, self.seed)

    # -- bajo nivel ---------------------------------------------------------
    def _leer(self) -> dict:
        with self._lock, open(self.path, encoding="utf-8") as f:
            return json.load(f)

    def _escribir(self, data: dict) -> None:
        with self._lock:
            tmp = self.path.with_suffix(".tmp")
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            os.replace(tmp, self.path)

    # -- consultas ----------------------------------------------------------
    def listar_usuarios(self) -> list[Usuario]:
        return [Usuario.model_validate(u) for u in self._leer()["usuarios"]]

    def obtener_usuario(self, usuario_id: int) -> Optional[Usuario]:
        return next((u for u in self.listar_usuarios() if u.id == usuario_id), None)

    def listar_categorias(self) -> list[Categoria]:
        return [Categoria.model_validate(c) for c in self._leer()["categorias"]]

    def listar_servicios(self) -> list[Servicio]:
        return [Servicio.model_validate(s) for s in self._leer()["servicios"]]

    def obtener_servicio(self, servicio_id: str) -> Optional[Servicio]:
        return next((s for s in self.listar_servicios() if s.id == servicio_id), None)

    # -- comandos -----------------------------------------------------------
    def registrar_tramite(self, usuario_id: int, tramite: TramiteReciente) -> None:
        with self._lock:
            data = self._leer()
            for u in data["usuarios"]:
                if u["id"] == usuario_id:
                    u.setdefault("tramites_recientes", []).insert(0, tramite.model_dump())
                    break
            self._escribir(data)

    def restablecer(self) -> None:
        with self._lock:
            shutil.copyfile(self.seed, self.path)


repo = JsonRepository()
