import { useEffect, useRef, useState } from "react";
import { Activity, AudioLines, Check, CircleStop, Cpu, Mic, ShieldCheck, Volume2, VolumeX, Waves } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };
type Health = { ollama_connected: boolean; configured_model: string; model_available: boolean };

const API = "http://127.0.0.1:8000";
const starter: Message = {
  role: "assistant",
  content: "I'm ready. Tell me what you'd like to accomplish, and I'll help you work through it."
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([starter]);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [speaking, setSpeaking] = useState(true);
  const [health, setHealth] = useState<Health | null>(null);
  const [status, setStatus] = useState("Checking local AI");
  const [error, setError] = useState("");
  const [lastTranscript, setLastTranscript] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const messagesEnd = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void checkHealth();
    const id = window.setInterval(() => void checkHealth(), 15000);
    return () => {
      window.clearInterval(id);
      stream.current?.getTracks().forEach((track) => track.stop());
      window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  async function checkHealth() {
    try {
      const response = await fetch(`${API}/api/health`);
      const data = (await response.json()) as Health;
      setHealth(data);
      setStatus(data.ollama_connected ? (data.model_available ? "AI system online" : "Model needs downloading") : "AI engine offline");
    } catch {
      setHealth(null);
      setStatus("Start the VYRON backend");
    }
  }

  function speak(text: string) {
    if (!speaking || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.02;
    utterance.pitch = 0.96;
    utterance.onstart = () => setStatus("Speaking response");
    utterance.onend = () => setStatus(health?.ollama_connected ? "Ready for your command" : "AI engine offline");
    window.speechSynthesis.speak(utterance);
  }

  async function sendCommand(raw: string) {
    const content = raw.trim();
    if (!content || busy) return;
    setError("");
    window.speechSynthesis?.cancel();
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setBusy(true);
    setStatus("Thinking through your request");

    try {
      const response = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-20) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "The local AI could not complete that request.");
      const answer = String(data.answer || "I didn't receive a usable response.");
      setMessages((current) => [...current, { role: "assistant", content: answer }]);
      setStatus("Response ready");
      speak(answer);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected connection error.";
      setError(message);
      setStatus("Needs attention");
    } finally {
      setBusy(false);
    }
  }

  async function startRecording() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError("This browser doesn't support microphone recording. Try a current version of Chrome or Edge.");
      return;
    }
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = audioStream;
      chunks.current = [];
      const mediaRecorder = new MediaRecorder(audioStream);
      recorder.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      };
      mediaRecorder.onstop = async () => {
        audioStream.getTracks().forEach((track) => track.stop());
        stream.current = null;
        setRecording(false);
        const blob = new Blob(chunks.current, { type: mediaRecorder.mimeType || "audio/webm" });
        if (!blob.size) {
          setError("No audio was captured. Try again.");
          return;
        }
        setStatus("Transcribing your command locally");
        setBusy(true);
        try {
          const form = new FormData();
          const extension = blob.type.includes("mp4") ? "mp4" : blob.type.includes("ogg") ? "ogg" : "webm";
          form.append("file", blob, `command.${extension}`);
          const response = await fetch(`${API}/api/voice/transcribe`, { method: "POST", body: form });
          const data = await response.json();
          if (!response.ok) throw new Error(data.detail || "Voice transcription failed.");
          const transcript = String(data.text || "").trim();
          if (!transcript) throw new Error("I couldn't hear a command clearly. Please try again.");
          setLastTranscript(transcript);
          setBusy(false);
          await sendCommand(transcript);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Voice transcription failed.");
          setBusy(false);
          setStatus("Ready to try again");
        }
      };
      mediaRecorder.start();
      setRecording(true);
      setStatus("Listening — tap stop when finished");
    } catch {
      setError("Microphone access was blocked. Allow microphone access in your browser settings and try again.");
      setStatus("Microphone unavailable");
    }
  }

  function stopRecording() {
    if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
  }

  function toggleSpeech() {
    if (speaking) window.speechSynthesis?.cancel();
    setSpeaking((value) => !value);
  }

  return (
    <main className="shell">
      <aside className="rail">
        <div className="brand-mark"><Waves size={23} strokeWidth={1.8} /></div>
        <div className="rail-line" />
        <div className="rail-icon active"><AudioLines size={19} /></div>
        <div className="rail-icon"><Activity size={19} /></div>
        <div className="rail-bottom"><ShieldCheck size={18} /></div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="brand-copy">
            <div className="eyebrow">PERSONAL INTELLIGENCE SYSTEM</div>
            <h1>VYRON<span className="brand-dot">.</span></h1>
          </div>
          <div className="top-status">
            <span className={health?.ollama_connected ? "status-dot online" : "status-dot"} />
            <span>{status}</span>
          </div>
        </header>

        <section className="hero">
          <div className="orb-wrap" aria-hidden="true">
            <div className={busy || recording ? "orb orb-active" : "orb"}>
              <div className="orb-core" />
              <div className="orb-ring ring-one" />
              <div className="orb-ring ring-two" />
              <div className="orb-ring ring-three" />
            </div>
          </div>
          <div className="hero-label">{recording ? "LISTENING TO YOUR VOICE" : busy ? "PROCESSING YOUR REQUEST" : "READY WHEN YOU ARE"}</div>
          <h2>Your intent.<br /><span>Intelligent action.</span></h2>
          <p className="hero-subtitle">A private, local-first assistant designed to listen, reason, and help you get things done.</p>
          <div className="capabilities">
            <span><Cpu size={14} /> Local AI</span>
            <span><Mic size={14} /> Voice-first</span>
            <span><ShieldCheck size={14} /> Permission-aware</span>
          </div>
        </section>

        <section className="conversation">
          <div className="section-heading">
            <div><span className="section-kicker">LIVE SESSION</span><h3>Conversation</h3></div>
            <button className="icon-button" onClick={toggleSpeech} title={speaking ? "Mute spoken responses" : "Enable spoken responses"} aria-label={speaking ? "Mute spoken responses" : "Enable spoken responses"}>
              {speaking ? <Volume2 size={17} /> : <VolumeX size={17} />}
            </button>
          </div>
          <div className="messages">
            {messages.map((message, index) => (
              <article className={message.role === "user" ? "message user-message" : "message assistant-message"} key={index}>
                <div className="message-avatar">{message.role === "user" ? "YOU" : <Waves size={15} />}</div>
                <div className="message-body">
                  <div className="message-meta">{message.role === "user" ? "YOUR COMMAND" : "VYRON"}</div>
                  <p>{message.content}</p>
                </div>
              </article>
            ))}
            {busy && <div className="thinking"><span /><span /><span /> <small>Working on your request</small></div>}
            <div ref={messagesEnd} />
          </div>

          {lastTranscript && <div className="transcript-note"><Check size={14} /> Last heard: “{lastTranscript}”</div>}
          {error && <div className="error-note">{error}</div>}

          <div className="command-area">
            <div className="command-hint">{recording ? "Speak clearly, then stop the recording" : "Voice is the primary way to interact with VYRON"}</div>
            <div className="command-controls">
              <button className={recording ? "mic-button recording" : "mic-button"} onClick={recording ? stopRecording : startRecording} disabled={busy} aria-label={recording ? "Stop recording" : "Start voice command"}>
                {recording ? <CircleStop size={21} /> : <Mic size={21} />}
                <span>{recording ? "Finish command" : "Speak to VYRON"}</span>
              </button>
              <div className="secondary-controls">
                <button className="secondary-button" onClick={() => { window.speechSynthesis?.cancel(); setStatus("Speech stopped"); }} title="Stop spoken response"><VolumeX size={17} /></button>
                <button className="secondary-button" onClick={() => void checkHealth()} title="Check local AI connection"><Activity size={17} /></button>
              </div>
            </div>
  
          </div>
        </section>

        <footer className="footer">
          <span><span className="footer-dot" /> PRIVATE LOCAL SESSION</span>
          <span>{health?.configured_model || "Ollama model"} · VYRON 0.1</span>
        </footer>
      </section>
    </main>
  );
}
