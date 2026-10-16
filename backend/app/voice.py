from __future__ import annotations

from functools import lru_cache


@lru_cache(maxsize=1)
def get_whisper_model(model_size: str):
    """Load Whisper once per backend process instead of reloading for every command."""
    from faster_whisper import WhisperModel

    return WhisperModel(model_size, device="cpu", compute_type="int8")
