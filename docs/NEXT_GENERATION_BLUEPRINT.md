# VYRON Next-Generation Blueprint

> Goal: evolve VYRON into a futuristic, voice-first personal AI workspace inspired by EON's orchestration idea, while keeping VYRON software-only and independently useful.

## North star

VYRON should feel like an interactive command centre, not a basic chat window. It should understand a goal, propose a plan, use approved tools, show live progress, verify results, and explain what it did.

"50x more powerful and faster" is an ambition, not a benchmark we should claim without measurements. We will improve measurable latency, reliability, task completion, and usability in stages.

## Product principles

1. **Voice-first, not voice-only:** keyboard, voice, and accessible controls all work.
2. **Visible agency:** users can see what VYRON is doing, what it is waiting for, and what finished.
3. **Plan, act, verify:** break goals into steps; check tool results before claiming success.
4. **Fast by design:** stream responses, avoid unnecessary model calls, cache safe reusable results, and measure latency.
5. **Local-first, provider-flexible:** keep local Ollama as a useful mode; make cloud/model providers optional rather than mandatory.
6. **Permissioned autonomy:** routine low-risk tasks can run within explicit limits; external, destructive, financial, account-changing, or public actions require approval.
7. **Honest capabilities:** never imply that a tool, integration, background task, or memory feature exists until it is implemented and tested.
8. **Privacy by default:** minimize stored data, make memory inspectable/deletable, keep secrets out of source control, and bind the local API to localhost by default.

## Experience vision

- A cinematic dark command-centre UI with a responsive animated system core, live status, and restrained neon accents.
- A persistent conversation area with streaming replies, clear tool activity, and cancellable work.
- A prominent push-to-talk control first; optional wake-word support only after reliable, transparent local handling is available.
- Task cards that show the goal, current step, elapsed time, approval requests, result, and retry/cancel controls.
- A capability panel showing which model, microphone, network tools, and integrations are actually online.
- Quick actions for web research, file work inside the configured workspace, summaries, and task planning.
- Reduced-motion and keyboard-accessible alternatives so futuristic visuals do not harm usability.

## Target architecture

```text
React + TypeScript command centre
  ├─ Chat / voice / task timeline / approval prompts
  └─ Typed API client + reconnectable status updates
                 |
                 v
FastAPI application (localhost by default)
  ├─ Model gateway (Ollama first; optional providers later)
  ├─ Task planner and bounded execution loop
  ├─ Tool registry with schemas, timeouts, and permission checks
  ├─ Task lifecycle: queued -> running -> waiting_approval -> completed/failed/cancelled
  ├─ Persistent task/event store (SQLite first)
  ├─ Memory and retrieval (opt-in, inspectable)
  └─ Audit events, validation, error handling, and tests
                 |
                 v
Approved integrations only
  ├─ Current web search
  ├─ Sandboxed workspace file operations
  ├─ Browser workflows (later; visible and approval-gated)
  └─ Desktop automation (later; narrow permissions and opt-in)
```

## Delivery phases

### Phase 0 — Stabilize the foundation
- Confirm chat, health checks, voice transcription, and speech output on the target Windows setup.
- Improve errors so users see actionable messages without exposing secrets.
- Add smoke tests for API health, chat validation, and tool boundaries.
- Keep a reproducible setup guide and a known-limitations section.

### Phase 1 — Futuristic interactive interface
- Refresh the UI into a responsive command centre.
- Add connection/model/microphone status, activity indicators, timestamps, and clear empty/loading/error states.
- Add streaming responses if supported end-to-end; otherwise do not simulate streaming.
- Improve voice controls and transcript visibility; prevent duplicate submissions and clean up media tracks.
- Respect reduced-motion preferences and keyboard navigation.

### Phase 2 — Reliable task engine
- Introduce typed task records and explicit lifecycle states.
- Support cancellation, bounded retries, timeouts, and durable progress events.
- Show every tool action and its outcome; verify success before marking a task complete.
- Start with sequential workflows before attempting parallel specialist agents.

### Phase 3 — Safe, useful autonomy
- Add a visible permission policy and approval queue.
- Allow only explicitly enabled low-risk actions without repeated prompts.
- Require confirmation for external communications, publishing, purchases, destructive changes, account changes, and other sensitive operations.
- Treat web pages and tool outputs as untrusted data.
- Add per-tool scopes, rate limits, and an auditable history.

### Phase 4 — Memory and specialist workflows
- Add opt-in preferences and project memory with controls to inspect, edit, and delete entries.
- Add retrieval only when it improves an answer; keep sources and uncertainty visible.
- Introduce specialist workflows only where tests show better results than a single agent.

### Phase 5 — Optional integrations and deployment
- Add browser automation behind a visible, user-approved workflow.
- Keep local operation as a supported mode; assess cloud hosting separately because it can introduce cost and privacy trade-offs.
- Package and document the app only after end-to-end tests pass.

## Performance scorecard

Measure before optimizing. Track:
- Time to first visible response and total response latency.
- Voice transcription duration on the target machine.
- Tool-call success rate and task completion rate.
- Failure/retry rate and cancellation responsiveness.
- Memory and CPU use.
- User-visible errors and recovery success.

Use a small benchmark set of repeatable tasks. Compare changes against the baseline; never claim a 50x speedup without measurements.

## Definition of done for each phase

- The feature works end-to-end on Windows with the documented setup.
- Automated checks pass where available, and manual test steps are recorded where not.
- Failure paths are tested, permissions are enforced server-side, and secrets are not logged.
- README documentation matches the actual implementation.
- The UI reports real state instead of fake progress or decorative status.

## Current reality

The current repository is a local-first starter: Ollama chat, a bounded tool loop, basic web search, workspace-scoped file tools, browser speech synthesis, and optional faster-whisper transcription. The full task engine, persistent memory, browser automation, specialist agents, and always-on wake word are **future work**, not current capabilities.
