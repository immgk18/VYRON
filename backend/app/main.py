from __future__ import annotations

import tempfile
from pathlib import Path

import httpx
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .agent import ask_vyron
from .config import OLLAMA_BASE_URL, OLLAMA_MODEL, WHISPER_MODEL
from .voice import get_whisper_model

app = FastAPI(title="VYRON Local Agent", version="0.1.0", description="Local-first voice AI agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1, max_length=12000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=30)


@app.get("/api/health")
async def health():
    ollama_ok = False
    models = []
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            response.raise_for_status()
            models = [item.get("name", "") for item in response.json().get("models", [])]
            ollama_ok = True
    except Exception:
        pass
    return {
        "status": "ok",
        "ollama_connected": ollama_ok,
        "configured_model": OLLAMA_MODEL,
        "model_available": any(m == OLLAMA_MODEL or m.startswith(OLLAMA_MODEL + ":") for m in models),
        "models": models,
    }


@app.post("/api/chat")
async def chat(request: ChatRequest):
    messages = [item.model_dump() for item in request.messages]
    try:
        answer = await ask_vyron(messages)
        return {"answer": answer, "model": OLLAMA_MODEL}
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Ollama is not running. Start Ollama and try again.")
    except httpx.HTTPStatusError as exc:
        detail = "The local AI model returned an error."
        if exc.response.status_code == 404:
            detail = f"Model '{OLLAMA_MODEL}' was not found. Run: ollama pull {OLLAMA_MODEL}"
        raise HTTPException(status_code=502, detail=detail)
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="The local model took too long to respond. Try a shorter command or a smaller model.")


@app.post("/api/voice/transcribe")
async def transcribe(file: UploadFile = File(...)):
    suffix = Path(file.filename or "recording.webm").suffix or ".webm"
    if suffix.lower() not in {".webm", ".wav", ".mp3", ".m4a", ".ogg", ".mp4"}:
        raise HTTPException(status_code=415, detail="Unsupported audio format.")
    data = await file.read()
    if not data or len(data) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Audio must be non-empty and no larger than 20 MB.")

    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp:
            temp.write(data)
            temp_path = temp.name
        model = get_whisper_model(WHISPER_MODEL)
        segments, _ = model.transcribe(temp_path, vad_filter=True)
        transcript = " ".join(segment.text.strip() for segment in segments).strip()
        if not transcript:
            raise HTTPException(status_code=422, detail="No speech was detected. Try speaking a little closer to the microphone.")
        return {"text": transcript}
    except HTTPException:
        raise
    except ImportError:
        raise HTTPException(status_code=503, detail="Speech recognition is not installed. Install the requirements.txt dependencies.")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not transcribe audio: {type(exc).__name__}")
    finally:
        if temp_path:
            Path(temp_path).unlink(missing_ok=True)


@app.get("/")
async def root():
    return {"name": "VYRON", "message": "Local-first voice AI agent", "docs": "/docs"}
