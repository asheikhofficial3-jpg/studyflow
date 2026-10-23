"use client";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, Flame, Play, Plus, Sparkles } from "lucide-react";
import Orb from "@/components/Orb";
import { EmptyState, PriorityBadge, ProgressBar, Stat } from "@/components/ui";
import { fmtDuration, planProgress, studyStreak, todayKey, totalStudySeconds, useStore } from "@/lib/store";
import { suggestNextStep } from "@/lib/agent";

export default function OverviewPage() {
  const { db, ready, completeTask } = useStore();
  if (!ready) return <p aria-live="polite">Loading your workspace…</p>;

  const today = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const name = db.preferences.displayName.trim();
  const todaysTasks = db.tasks.filter((t) => t.status !== "completed" && (!t.dueDate || t.dueDate <= todayKey())).slice(0, 5);
  const activePlan = db.plans.find((p) => p.status === "active");
  const prog = activePlan ? planProgress(db, activePlan.id) : null;
  const doneCount = db.tasks.filter((t) => t.status === "completed").length;
  const recent = [
    ...db.sessions.filter((s) => s.completed).slice(0, 3).map((s) => ({ id: `s-${s.id}`, text: `Focus session — ${fmtDuration(s.durationSeconds)}`, at: s.endedAt })),
    ...db.tasks.filter((t) => t.completedAt).slice(0, 3).map((t) => ({ id: `t-${t.id}`, text: `Completed “${t.title}”`, at: t.completedAt! })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5);
  const isNew = !db.plans.length && !db.tasks.length && !db.sessions.length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{name ? `Welcome back, ${name}` : "Welcome to StudyFlow"}</h1>
        <p className="mt-1 text-sm capitalize" style={{ color: "#9fb0d8" }}>{today}</p>
      </div>

      {isNew && (
        <div className="card mb-6 p-6">
          <p className="text-lg font-bold">Start in under a minute</p>
          <p className="mt-1 max-w-2xl text-sm" style={{ color: "#9fb0d8" }}>Create a study plan and StudyFlow generates sequenced tasks for you. Or ask the AI Study Agent to do it — try “Create a plan to learn…”. Everything is stored locally in this browser; nothing is invented and no account is needed.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/plans" className="btn-primary"><Plus size={16} /> Create a study plan</Link>
            <Link href="/agent" className="btn-ghost"><Sparkles size={16} /> Ask the AI Agent</Link>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <div className="card flex flex-col items-center p-6 text-center">
          <Orb state="idle" size={110} />
          <p className="mt-3 text-sm font-semibold">Your next recommended action</p>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: "#9fb0d8" }} aria-live="polite">{suggestNextStep(db)}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href="/focus" className="btn-primary"><Play size={16} /> Start focusing</Link>
            <Link href="/agent" className="btn-ghost">Ask agent <ArrowRight size={16} /></Link>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <Stat label="Study time recorded" value={fmtDuration(totalStudySeconds(db))} hint="Completed sessions only" />
            <Stat label="Tasks completed" value={String(doneCount)} hint={`of ${db.tasks.length} total`} />
            <Stat label="Day streak" value={`${studyStreak(db)}`} hint="Based on recorded sessions" />
            <Stat label="Active plans" value={String(db.plans.filter((p) => p.status === "active").length)} hint={`${db.plans.length} total plans`} />
          </div>

          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">Today&apos;s tasks</h2>
              <Link href="/tasks" className="text-sm font-semibold" style={{ color: "#3ee6b6" }}>Manage tasks</Link>
            </div>
            {todaysTasks.length === 0 ? (
              <p className="text-sm" style={{ color: "#9fb0d8" }}>No pending tasks due today. <Link href="/tasks" className="underline">Add one</Link> or check upcoming tasks in My Tasks.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {todaysTasks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5" style={{ borderColor: "#22315f" }}>
                    <span className="min-w-0"><span className="block truncate text-sm font-semibold">{t.title}</span><span className="flex items-center gap-2 text-xs" style={{ color: "#9fb0d8" }}><Clock3 size={12} /> ~{t.estimatedMinutes} min <PriorityBadge p={t.priority} /></span></span>
                    <button className="btn-ghost !px-3 !py-1.5 text-sm" onClick={() => completeTask(t.id)} aria-label={`Mark ${t.title} complete`}><CheckCircle2 size={15} /> Done</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {activePlan && prog && (
            <div className="card p-5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="font-bold">Active plan: {activePlan.title}</h2>
                <span className="text-sm font-bold" style={{ color: "#7df0cd" }}>{prog.pct}%</span>
              </div>
              <ProgressBar pct={prog.pct} label={`Progress for ${activePlan.title}`} />
              <p className="mt-2 text-sm" style={{ color: "#9fb0d8" }}>{prog.done} of {prog.total} tasks completed · Goal: {activePlan.goal}</p>
              <Link href="/plans" className="btn-ghost mt-3 text-sm">View plan <ArrowRight size={15} /></Link>
            </div>
          )}

          <div className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 font-bold"><Flame size={17} style={{ color: "#ffd98a" }} /> Recent activity</h2>
            {recent.length === 0 ? (
              <p className="text-sm" style={{ color: "#9fb0d8" }}>No activity yet. Completed tasks and focus sessions will appear here — StudyFlow never invents history.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {recent.map((r) => (<li key={r.id} className="flex justify-between gap-3"><span>{r.text}</span><time className="shrink-0" style={{ color: "#9fb0d8" }}>{new Date(r.at).toLocaleDateString()}</time></li>))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {!isNew && db.plans.length === 0 && <div className="mt-5"><EmptyState title="No study plan yet" body="Plans turn a goal into sequenced tasks with progress tracking."><Link href="/plans" className="btn-primary"><Plus size={16} /> Create plan</Link></EmptyState></div>}
    </div>
  );
}
