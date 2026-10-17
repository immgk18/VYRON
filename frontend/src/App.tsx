import { FormEvent, useEffect, useRef, useState } from "react";
import { Activity, ArrowUp, AudioLines, Check, CircleStop, Command, Cpu, Mic, ShieldCheck, Sparkles, Volume2, VolumeX, Waves, Zap, Clock3 } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };
type Health = { ollama_connected: boolean; configured_model: string; model_available: boolean };
const API = "http://127.0.0.1:8000";
const starter: Message = { role: "assistant", content: "VYRON is ready. Tell me the outcome you want, and we’ll take it one step at a time." };

export default function App() {
  const [messages, setMessages] = useState<Message[]>([starter]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [speaking, setSpeaking] = useState(true);
  const [health, setHealth] = useState<Health | null>(null);
  const [status, setStatus] = useState("Checking local engine");
  const [error, setError] = useState("");
  const [lastTranscript, setLastTranscript] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const messagesEnd = useRef<HTMLDivElement | null>(null);
  const draftRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    void checkHealth();
    const id = window.setInterval(() => void checkHealth(), 15000);
    return () => {
      window.clearInterval(id);
      stream.current?.getTracks().forEach((track) => track.stop());
      window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, busy]);

  async function checkHealth() {
    try {
      const response = await fetch(`${API}/api/health`);
      if (!response.ok) throw new Error("Health check failed");
      const data = (await response.json()) as Health;
      setHealth(data);
      setStatus(data.ollama_connected ? (data.model_available ? "Local engine online" : "Model not downloaded") : "Local engine offline");
    } catch {
      setHealth(null);
      setStatus("Backend not connected");
    }
  }

  function speak(text: string) {
    if (!speaking || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.02;
    utterance.pitch = 0.96;
    utterance.onstart = () => setStatus("Speaking response");
    utterance.onend = () => setStatus(health?.ollama_connected ? "Ready for your next task" : "Local engine offline");
    window.speechSynthesis.speak(utterance);
  }

  async function sendCommand(raw: string, fromVoice = false) {
    const content = raw.trim();
    if (!content || busy) return;
    setError("");
    setDraft("");
    window.speechSynthesis?.cancel();
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setBusy(true);
    setStatus("Reasoning on your request");
    try {
      const response = await fetch(`${API}/api/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-20) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "The local AI could not complete that request.");
      const answer = String(data.answer || "I didn't receive a usable response.");
      setMessages((current) => [...current, { role: "assistant", content: answer }]);
      setStatus("Response ready");
      speak(answer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected connection error.");
      setStatus("Needs attention");
    } finally {
      setBusy(false);
      if (!fromVoice) draftRef.current?.focus();
    }
  }

  function submitText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendCommand(draft);
  }

  async function startRecording() {
    setError("");
    if (busy) return;
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
      mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.current.push(event.data); };
      mediaRecorder.onstop = async () => {
        audioStream.getTracks().forEach((track) => track.stop());
        stream.current = null;
        setRecording(false);
        const blob = new Blob(chunks.current, { type: mediaRecorder.mimeType || "audio/webm" });
        if (!blob.size) { setError("No audio was captured. Try again."); return; }
        setStatus("Transcribing audio locally");
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
          await sendCommand(transcript, true);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Voice transcription failed.");
          setBusy(false);
          setStatus("Ready to try again");
        }
      };
      mediaRecorder.start();
      setRecording(true);
      setStatus("Listening — stop when you're done");
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

  const online = Boolean(health?.ollama_connected && health.model_available);

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="VYRON navigation">
        <a className="brand-symbol" href="#home" aria-label="VYRON home"><Waves size={21} strokeWidth={1.8} /></a>
        <div className="sidebar-divider" />
        <button className="nav-button selected" aria-label="Assistant" title="Assistant"><AudioLines size={19} /></button>
        <button className="nav-button" onClick={() => document.getElementById("system-panel")?.scrollIntoView({ behavior: "smooth" })} aria-label="System status" title="System status"><Activity size={19} /></button>
        <div className="sidebar-bottom"><ShieldCheck size={18} /><span>LOCAL</span></div>
      </aside>

      <div className="main-column" id="home">
        <header className="topbar">
          <div className="brand-lockup"><div className="eyebrow">PERSONAL INTELLIGENCE / 001</div><h1>VYRON<span>.</span></h1></div>
          <div className="topbar-right">
            <div className="connection-pill"><span className={online ? "status-led online" : "status-led"} />{status}</div>
            <button className="icon-button" onClick={toggleSpeech} title={speaking ? "Mute spoken responses" : "Enable spoken responses"} aria-label={speaking ? "Mute spoken responses" : "Enable spoken responses"}>{speaking ? <Volume2 size={17} /> : <VolumeX size={17} />}</button>
          </div>
        </header>

        <div className="content-grid">
          <section className="main-stage">
            <div className="welcome-row">
              <div>
                <div className="eyebrow accent-label"><Sparkles size={13} /> YOUR AI WORKSPACE</div>
                <h2>Make room for<br /><span>what’s next.</span></h2>
                <p className="intro-copy">Think clearly. Move deliberately. Let the busywork become simpler.</p>
              </div>
              <div className={busy || recording ? "core-visual core-active" : "core-visual"} aria-label={recording ? "Listening" : busy ? "Processing" : "VYRON core ready"} role="img">
                <div className="core-halo halo-a" /><div className="core-halo halo-b" />
                <div className="core-orb"><div className="core-glint" /></div>
                <div className="core-crosshair crosshair-a" /><div className="core-crosshair crosshair-b" />
              </div>
            </div>

            <div className="capability-row">
              <div className="capability"><Cpu size={15} /><span>Local model</span><i className={online ? "mini-led live" : "mini-led"} /></div>
              <div className="capability"><Mic size={15} /><span>Voice input</span><i className="mini-led neutral" /></div>
              <div className="capability"><ShieldCheck size={15} /><span>Bounded autonomy</span><i className="mini-led neutral" /></div>
            </div>

            <section className="conversation-panel glass-panel" aria-label="Conversation">
              <div className="panel-heading">
                <div><div className="eyebrow">WORKSPACE / SESSION 01</div><h3>Conversation</h3></div>
                <div className="session-state"><span className={busy ? "pulse-dot working" : "pulse-dot"} />{busy ? "In progress" : "Ready"}</div>
              </div>
              <div className="message-list" aria-live="polite">
                {messages.map((message, index) => (
                  <article className={message.role === "user" ? "chat-message user-chat" : "chat-message assistant-chat"} key={index}>
                    <div className="chat-avatar">{message.role === "user" ? "YOU" : <Waves size={15} />}</div>
                    <div className="chat-content">
                      <div className="chat-meta"><span>{message.role === "user" ? "YOU" : "VYRON"}</span><span>{message.role === "user" ? "COMMAND" : "ASSISTANT"}</span></div>
                      <p>{message.content}</p>
                    </div>
                  </article>
                ))}
                {busy && <div className="thinking-row"><span /><span /><span /><small>Working through your request</small></div>}
                <div ref={messagesEnd} />
              </div>
              {lastTranscript && <div className="transcript-note"><Check size={14} /> Last heard: “{lastTranscript}”</div>}
              {error && <div className="error-note" role="alert">{error}</div>}
              <form className="composer" onSubmit={submitText}>
                <textarea ref={draftRef} value={draft} onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if (!busy) void sendCommand(draft); } }}
                  placeholder="Tell VYRON what you want to accomplish…" aria-label="Message VYRON" rows={2} disabled={busy || recording} />
                <div className="composer-footer">
                  <span><Command size={12} /> Enter to send · Shift + Enter for a new line</span>
                  <div className="composer-actions">
                    <button type="button" className={recording ? "mic-control recording" : "mic-control"} onClick={recording ? stopRecording : startRecording} disabled={busy} aria-label={recording ? "Stop recording" : "Start voice command"} title={recording ? "Finish voice command" : "Speak to VYRON"}>{recording ? <CircleStop size={17} /> : <Mic size={17} />}</button>
                    <button type="submit" className="send-button" disabled={busy || !draft.trim()} aria-label="Send message"><ArrowUp size={18} /></button>
                  </div>
                </div>
              </form>
            </section>
            <div className="bottom-note"><ShieldCheck size={14} /><span>Local-first session</span><span className="note-separator">/</span><span>Tools stay within configured permissions</span></div>
          </section>

          <aside className="right-rail">
            <section className="side-card glass-panel" id="system-panel">
              <div className="side-card-heading"><span className="eyebrow">SYSTEM OVERVIEW</span><Activity size={16} /></div>
              <div className="system-status"><span className={online ? "large-led live" : "large-led"} /><div><strong>{online ? "Engine ready" : health?.ollama_connected ? "Model unavailable" : "Awaiting connection"}</strong><small>{health?.configured_model || "Ollama model"}</small></div></div>
              <div className="metric-line"><span>Inference engine</span><strong>{health?.ollama_connected ? "Connected" : "Offline"}</strong></div>
              <div className="metric-line"><span>Configured model</span><strong>{health?.configured_model || "—"}</strong></div>
              <div className="metric-line"><span>Model available</span><strong>{health ? (health.model_available ? "Yes" : "No") : "Unknown"}</strong></div>
              <button className="refresh-button" onClick={() => void checkHealth()}><Activity size={14} /> Refresh status</button>
            </section>

            <section className="side-card glass-panel">
              <div className="side-card-heading"><span className="eyebrow">OPERATING POLICY</span><ShieldCheck size={16} /></div>
              <div className="policy-title"><span className="policy-icon"><Zap size={17} /></span><div><strong>High autonomy</strong><small>Strict limits · design target</small></div></div>
              <p className="side-copy">The goal is to handle approved multi-step tasks while keeping sensitive actions behind explicit approval.</p>
              <div className="policy-rule"><Check size={14} /><span>Bounded tool access</span></div>
              <div className="policy-rule"><Check size={14} /><span>Visible progress and results</span></div>
              <div className="policy-rule"><ShieldCheck size={14} /><span>Approval for sensitive actions</span></div>
              <div className="policy-footnote">This describes the intended design. A persistent task engine and approval queue are not implemented yet.</div>
            </section>

            <section className="side-card glass-panel quick-card">
              <div className="side-card-heading"><span className="eyebrow">START SOMEWHERE</span><Clock3 size={16} /></div>
              <button className="quick-action" onClick={() => { setDraft("Research the latest developments in a topic and summarize the most reliable sources."); draftRef.current?.focus(); }}><span className="quick-icon"><Activity size={15} /></span><span><strong>Research a topic</strong><small>Gather and summarize information</small></span><ArrowUp size={14} /></button>
              <button className="quick-action" onClick={() => { setDraft("Help me organize the files in my VYRON workspace safely."); draftRef.current?.focus(); }}><span className="quick-icon"><Command size={15} /></span><span><strong>Organize a workspace</strong><small>Plan safe file operations</small></span><ArrowUp size={14} /></button>
            </section>
          </aside>
        </div>
        <footer className="app-footer"><span><span className="footer-led" /> VYRON / LOCAL SESSION</span><span>{health?.configured_model || "MODEL NOT DETECTED"} <i>·</i> FRONTEND PREVIEW</span></footer>
      </div>
    </main>
  );
}
