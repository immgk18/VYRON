# VYRON

VYRON is a local-first, voice-first personal AI agent for Windows. It connects to a local Ollama model, supports spoken commands, and can use a small set of controlled tools.

## Current foundation

- **Local AI:** Ollama (default model: `qwen3:4b`)
- **Backend:** Python + FastAPI
- **Voice input:** optional local transcription with faster-whisper
- **Voice output:** browser speech synthesis
- **Tools:** time, web search, and safe file operations inside VYRON's workspace
- **Frontend:** React + TypeScript + Vite

This is a starter foundation, not an unrestricted computer-control system. It does not run arbitrary shell commands or publish to social media. External actions should be added through authorized integrations with explicit approval.

## Requirements

- Windows 10/11
- Python 3.11 or 3.12 recommended
- Node.js 20 or newer
- [Ollama for Windows](https://ollama.com/download/windows)

## 1. Start the local model

Install Ollama, then in PowerShell:

```powershell
ollama pull qwen3:4b
ollama serve
```

If Ollama is already running in the background, you don't need to run `ollama serve` again.

## 2. Start the backend

From the repository root:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

If you have another supported Python version installed, replace `py -3.11` with `py -3`.

The API is available at http://127.0.0.1:8000 and interactive API docs at http://127.0.0.1:8000/docs.

## 3. Start the frontend

Open a second PowerShell window:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL Vite prints, usually http://localhost:5173. Allow microphone access when prompted.

## Voice setup

Click **Speak** and talk. The browser records your audio and sends it to the backend. Local transcription uses faster-whisper's `small` model on CPU by default and downloads the model on first use. You can change the size in `.env` to `base` or `tiny` if needed.

Browser speech synthesis speaks replies using an installed system/browser voice. Voice availability varies by Windows/browser configuration.

## Configuration

Edit `.env`:

- `OLLAMA_BASE_URL`: local Ollama endpoint
- `OLLAMA_MODEL`: model name already pulled into Ollama
- `VYRON_WORKSPACE`: folder where VYRON may read/write files
- `WHISPER_MODEL`: local transcription model size

## Safety boundaries

- The backend binds to localhost by default.
- File tools are restricted to VYRON's workspace.
- The agent cannot execute arbitrary terminal commands.
- Web pages are untrusted input.
- Publishing, messaging, purchases, account changes, and destructive actions are not enabled in this starter.

## Roadmap

1. Validate local chat and voice.
2. Add reliable browser workflows with user-approved actions.
3. Add background task status, cancellation, and recovery.
4. Add optional desktop automation behind narrow permissions.
5. Add tests and package the desktop application.

## License

MIT — see [LICENSE](LICENSE).
