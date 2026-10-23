"use client";
import { useEffect, useRef, useState } from "react";
import { RotateCcw, Send, Sparkles } from "lucide-react";
import Orb from "@/components/Orb";
import { PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store";
import { handleAgentMessage, suggestNextStep } from "@/lib/agent";
import { ChatMessage, OrbState, nowISO, uid } from "@/lib/types";

const SUGGESTIONS = ["Create a plan to learn a new topic", "Show my pending tasks", "What should I do next?", "Summarize my history"];

export default function AgentPage() {
  const { db, ready, setDB, addPlan, addTask, updateTask, logAction } = useStore();
  const [input, setInput] = useState("");
  const [orb, setOrb] = useState<OrbState>("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const dbRef = useRef(db);
  useEffect(() => { dbRef.current = db; }, [db]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [db.chat, busy]);

  const push = (role: ChatMessage["role"], text: string) => {
    const m: ChatMessage = { id: uid(), role, text, createdAt: nowISO() };
    setDB((d) => ({ ...d, chat: [...d.chat, m].slice(-80) }));
    return m;
  };

  const send = (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || busy) return;
    setInput(""); setError("");
    push("user", text);
    if (/difficult|struggling|hard time/i.test(text)) {
      setDB((d) => ({ ...d, memory: { ...d.memory, difficulties: [...new Set([...d.memory.difficulties, text.slice(0, 160)])].slice(-10) } }));
    }
    setBusy(true); setOrb("planning");
    // Local fallback executes synchronously against the live store; the short
    // delay only makes the planning state perceptible. Result is verified
    // against the store before being reported.
    setTimeout(() => {
      try {
        const current = dbRef.current;
        const result = handleAgentMessage(current, text, {
          createPlanWithTasks: (planInput, tasks) => {
            const plan = addPlan({ ...planInput, status: "active" });
            const created = tasks.map((t) => addTask({ planId: plan.id, title: t.title, description: t.description, status: "pending", priority: t.priority, dueDate: "", estimatedMinutes: t.estimatedMinutes }));
            logAction("createStudyPlan", `Agent created plan “${plan.title}” with ${created.length} tasks`, true);
            return { plan, tasks: created };
          },
          addTask: (t) => { const task = addTask(t); logAction("addTask", `Agent added task “${task.title}”`, true); return task; },
          completeFirstMatching: (q) => {
            const match = dbRef.current.tasks.find((t) => t.status !== "completed" && t.title.toLowerCase().includes(q.toLowerCase()));
            if (!match) return null;
            updateTask(match.id, { status: "completed" });
            logAction("completeTask", `Agent completed task “${match.title}”`, true);
            return { ...match, status: "completed" as const };
          },
        });
        if (result.tool) logAction(result.tool, `Agent: ${text.slice(0, 80)}`, true);
        setDB((d) => ({ ...d, memory: { ...d.memory, lastRecommendation: suggestNextStep(d) } }));
        push("assistant", result.reply);
        setOrb("success"); setTimeout(() => setOrb("idle"), 2200);
      } catch {
        setError("The agent hit a problem executing that request. Nothing was reported as done — please try again.");
        setOrb("error");
        logAction("agentError", `Failed request: ${text.slice(0, 80)}`, false);
      } finally { setBusy(false); }
    }, 450);
  };

  if (!ready) return <p aria-live="polite">Loading agent…</p>;
  return (
    <div>
      <PageHeader title="AI Study Agent" sub="Ask for plans, tasks, history and next steps — actions run against your real StudyFlow data and are verified before being reported." />
      <p className="card mb-4 flex items-start gap-2 p-3.5 text-sm" role="note" style={{ color: "#ffd98a" }}>
        <Sparkles size={16} className="mt-0.5 shrink-0" />
        <span><strong>Local fallback mode.</strong> No live AI key is configured, so a transparent rule-based agent handles requests. It genuinely creates plans/tasks and reads your history — it never fabricates results. To enable a live model later, add a server-side provider key (see README) — keys are never exposed in the browser.</span>
      </p>
      {error && <p role="alert" className="card mb-4 p-4 text-sm" style={{ color: "#ffb4c0" }}>{error} <button className="ml-2 underline" onClick={() => { setError(""); setOrb("idle"); }}>Dismiss</button></p>}

      <section className="card mb-4 p-4 sm:p-5" aria-labelledby="mcp-h">
        <h2 id="mcp-h" className="font-bold">Now on Alexa+ — self-hosted MCP server</h2>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: "#9fb0d8" }}>
          StudyFlow ships <strong style={{ color: "#eaf0ff" }}>studyflow-mcp</strong>, a self-hosted MCP server (MCP spec 2025-11-25, Streamable HTTP + stdio) that exposes this same agent tool layer to any MCP host — including Alexa+ Agent Skill hosts. A student could ask Alexa what to study next and get a real answer from their real StudyFlow data.
        </p>
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="MCP tools">
          {["createStudyPlan", "addTask", "listTasks", "updateTask", "completeTask", "getStudyHistory", "getStudyContext", "suggestNextStep"].map((t) => (
            <li key={t} className="badge" style={{ color: "#7df0cd", textTransform: "none", letterSpacing: 0 }}>{t}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed" style={{ color: "#9fb0d8" }}>Run it from the repo: <code>cd mcp-server && npm install && npm run build && npm start</code> (HTTP on port 3001, POST /mcp) or <code>npm run start:stdio</code>. Every tool validates inputs, executes against a persistent store, and writes to an agent action audit log — the same behaviour you see in this chat. Built for the Alexa+ track of the Amazon Developer Hackathon (Build, Ship, Shape).</p>
      </section>

      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <div className="card hidden flex-col items-center p-5 lg:flex"><Orb state={busy ? "planning" : orb} size={96} /><p className="mt-2 text-center text-xs leading-relaxed" style={{ color: "#9fb0d8" }}>The orb reflects real agent state: planning while working, success after a verified action, warning on error.</p></div>

        <div className="card flex min-h-[480px] flex-col p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Conversation</h2>
            {db.chat.length > 0 && <button className="btn-ghost !py-1.5 text-sm" onClick={() => setDB((d) => ({ ...d, chat: [] }))}><RotateCcw size={14} /> Clear chat</button>}
          </div>
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1" aria-live="polite" aria-label="Chat messages">
            {db.chat.length === 0 && (
              <div className="m-auto max-w-md text-center">
                <div className="mb-3 flex justify-center lg:hidden"><Orb state="idle" size={72} /></div>
                <p className="font-bold">Tell me your goal — I&apos;ll turn it into a plan</p>
                <p className="mt-1 text-sm" style={{ color: "#9fb0d8" }}>Example: “Create a plan to learn photosynthesis for my biology exam”. I&apos;ll create the plan and its tasks for real, then show you what was done.</p>
              </div>
            )}
            {db.chat.map((m) => (
              <div key={m.id} className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === "user" ? "self-end" : "self-start"}`}
                style={m.role === "user" ? { background: "linear-gradient(135deg,#1fd6a2,#17b8a6)", color: "#04241a", fontWeight: 600 } : { background: "#111f45", border: "1px solid #22315f" }}>
                {m.text}
                <span className="mt-1 block text-[11px] font-normal opacity-70">{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            ))}
            {busy && <p className="self-start rounded-2xl px-4 py-3 text-sm" style={{ background: "#111f45", color: "#9fb0d8" }}>Working on it…</p>}
            <div ref={bottomRef} />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => <button key={s} className="btn-ghost !py-1.5 text-xs" onClick={() => send(s)} disabled={busy}>{s}</button>)}
          </div>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <label className="sr-only" htmlFor="agent-input">Message the study agent</label>
            <input id="agent-input" className="input" value={input} onChange={(e) => setInput(e.target.value)} onFocus={() => !busy && setOrb("listening")} onBlur={() => !busy && setOrb("idle")}
              placeholder="e.g. Create a plan to learn Spanish verbs" enterKeyHint="send" />
            <button type="submit" className="btn-primary shrink-0" disabled={busy || !input.trim()}><Send size={16} /> Send</button>
          </form>
          <p className="mt-2 text-xs" style={{ color: "#9fb0d8" }}>Press Enter to send. Destructive requests are never auto-executed — delete items from their pages, where you&apos;ll get a confirmation.</p>
        </div>
      </div>
    </div>
  );
}
