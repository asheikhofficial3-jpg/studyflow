"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Pause, Play, RotateCcw, SquareCheckBig } from "lucide-react";
import Orb from "@/components/Orb";
import { Field, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store";
import { OrbState } from "@/lib/types";

const TKEY = "studyflow-timer-v1";
interface SavedTimer { endsAt: number; totalSeconds: number; startedAt: string; taskId: string; planId: string; pausedRemaining: number | null }

export default function FocusPage() {
  const { db, ready, addSession, logAction } = useStore();
  const [minutes, setMinutes] = useState(25);
  const [taskId, setTaskId] = useState("");
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(25 * 60);
  const [total, setTotal] = useState(25 * 60);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [orb, setOrb] = useState<OrbState>("idle");
  const endsAtRef = useRef<number>(0);
  const doneRef = useRef(false);

  // Restore an in-progress timer after reload (only elapsed real time counts).
  // This synchronizes state from localStorage, an external system.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!ready) return;
    setMinutes(db.preferences.defaultFocusMinutes);
    setRemaining(db.preferences.defaultFocusMinutes * 60);
    setTotal(db.preferences.defaultFocusMinutes * 60);
    try {
      const raw = localStorage.getItem(TKEY);
      if (raw) {
        const s = JSON.parse(raw) as SavedTimer;
        setTaskId(s.taskId); setTotal(s.totalSeconds); setStartedAt(s.startedAt); doneRef.current = false;
        if (s.pausedRemaining != null) { setRemaining(s.pausedRemaining); }
        else {
          const left = Math.max(0, Math.round((s.endsAt - Date.now()) / 1000));
          setRemaining(left);
          if (left > 0) { endsAtRef.current = s.endsAt; setRunning(true); setOrb("executing"); }
          else localStorage.removeItem(TKEY);
        }
      }
    } catch { /* no saved timer */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const persistTimer = (patch: Partial<SavedTimer>) => {
    try {
      const base: SavedTimer = { endsAt: endsAtRef.current, totalSeconds: total, startedAt: startedAt ?? new Date().toISOString(), taskId, planId: db.tasks.find((t) => t.id === taskId)?.planId ?? "", pausedRemaining: null };
      localStorage.setItem(TKEY, JSON.stringify({ ...base, ...patch }));
    } catch { /* storage unavailable */ }
  };

  const start = () => {
    const startISO = startedAt ?? new Date().toISOString();
    if (!startedAt) setStartedAt(startISO);
    endsAtRef.current = Date.now() + remaining * 1000;
    doneRef.current = false;
    setRunning(true); setOrb("executing"); setSummary("");
    persistTimer({ endsAt: endsAtRef.current, startedAt: startISO, pausedRemaining: null });
  };

  const pause = () => { setRunning(false); setOrb("listening"); persistTimer({ pausedRemaining: remaining }); };

  const reset = () => {
    setRunning(false); setRemaining(minutes * 60); setTotal(minutes * 60); setStartedAt(null); setOrb("idle"); setSummary("");
    try { localStorage.removeItem(TKEY); } catch { /* ignore */ }
  };

  const finish = (natural = false) => {
    const elapsed = Math.max(0, total - (natural ? 0 : remaining));
    setRunning(false);
    try { localStorage.removeItem(TKEY); } catch { /* ignore */ }
    if (elapsed < 5 || !startedAt) {
      setOrb("idle");
      setSummary("Session too short to record (under 5 seconds). Uncompleted time is never recorded as study time.");
      return;
    }
    const task = db.tasks.find((t) => t.id === taskId);
    addSession({ taskId: taskId || null, planId: task?.planId ?? null, startedAt, endedAt: new Date().toISOString(), durationSeconds: elapsed, plannedMinutes: Math.round(total / 60), completed: true });
    logAction("focusSession", `Recorded focus session of ${Math.round(elapsed / 60)} min${task ? ` for “${task.title}”` : ""}`, true);
    setOrb("success");
    setSummary(`Session saved: ${Math.floor(elapsed / 60)}m ${elapsed % 60}s${task ? ` on “${task.title}”` : ""}. It now appears in Study History and Progress.`);
    setStartedAt(null); setRemaining(minutes * 60); setTotal(minutes * 60);
    setTimeout(() => setOrb("idle"), 3500);
  };

  // Countdown loop — declared after `finish` so it can call it directly.
  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => {
      const left = Math.max(0, Math.round((endsAtRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0 && !doneRef.current) { doneRef.current = true; finish(true); }
    }, 500);
    return () => clearInterval(iv);
    // finish reads current state at call time; interval only depends on `running`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const applyMinutes = (m: number) => { const v = Math.min(180, Math.max(1, m || 1)); setMinutes(v); if (!running && !startedAt) { setRemaining(v * 60); setTotal(v * 60); } };
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const pct = total ? Math.round(((total - remaining) / total) * 100) : 0;
  const openTasks = db.tasks.filter((t) => t.status !== "completed");

  if (!ready) return <p aria-live="polite">Loading focus timer…</p>;
  return (
    <div>
      <PageHeader title="Focus Session" sub="A distraction-minimizing timer. Only time you actually complete is recorded — StudyFlow never verifies attention, and browser timers can drift if the tab is fully closed." />
      <div className="card mx-auto max-w-xl p-6 text-center sm:p-8">
        <div className="flex justify-center"><Orb state={orb} size={92} /></div>
        <p className="mt-2 font-mono text-6xl font-extrabold tabular-nums" aria-live="off" aria-label={`Time remaining ${mm} minutes ${ss} seconds`}>{mm}:{ss}</p>
        <div className="mx-auto mt-4 max-w-sm"><div className="progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Session progress"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
        <p className="mt-1.5 text-xs" style={{ color: "#9fb0d8" }}>{pct}% of {Math.round(total / 60)} minutes</p></div>

        <div className="mx-auto mt-5 grid max-w-sm gap-4 text-left">
          <Field label="Duration (minutes)">
            <input className="input" type="number" min={1} max={180} value={minutes} disabled={running || !!startedAt} onChange={(e) => applyMinutes(Number(e.target.value))} />
          </Field>
          <Field label="Task (optional)">
            <select className="input" value={taskId} disabled={running} onChange={(e) => setTaskId(e.target.value)}>
              <option value="">No task — general study</option>
              {openTasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </Field>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {!running ? <button className="btn-primary" onClick={start}><Play size={16} /> {startedAt ? "Resume" : "Start"}</button>
            : <button className="btn-ghost" onClick={pause}><Pause size={16} /> Pause</button>}
          <button className="btn-ghost" onClick={() => finish(false)} disabled={!startedAt}><SquareCheckBig size={16} /> Finish & save</button>
          <button className="btn-ghost" onClick={reset}><RotateCcw size={16} /> Reset</button>
        </div>
        {summary && <p role="status" className="mt-5 rounded-xl border p-3 text-sm" style={{ borderColor: "#22315f", color: "#7df0cd" }}>{summary}</p>}
        <p className="mt-4 text-xs" style={{ color: "#9fb0d8" }}>Reload-safe: an in-progress timer is restored from its real end time. If you close the tab entirely, finish the session when you return — partial time is only saved via “Finish & save”.</p>
        <Link href="/history" className="mt-2 inline-block text-sm font-semibold" style={{ color: "#3ee6b6" }}>View session history →</Link>
      </div>
    </div>
  );
}
