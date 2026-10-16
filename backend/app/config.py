from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env")

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen3:4b")
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "small")

_workspace_value = os.getenv("VYRON_WORKSPACE", "./workspace")
WORKSPACE = (ROOT_DIR / _workspace_value).resolve() if not Path(_workspace_value).is_absolute() else Path(_workspace_value).resolve()
WORKSPACE.mkdir(parents=True, exist_ok=True)


def workspace_path(relative_path: str = ".") -> Path:
    """Resolve a user-supplied path and reject attempts to leave VYRON's workspace."""
    candidate = (WORKSPACE / relative_path).resolve()
    if candidate != WORKSPACE and WORKSPACE not in candidate.parents:
        raise ValueError("That path is outside VYRON's allowed workspace.")
    return candidate
