"use client";
import { useState } from "react";
import Link from "next/link";
import { PageHeader, EmptyState, Stat } from "@/components/ui";
import { fmtDuration, totalStudySeconds, useStore } from "@/lib/store";

export default function HistoryPage() {
  const { db, ready } = useStore();
  const [planFilter, setPlanFilter] = useState("all");
  if (!ready) return <p aria-live="polite">Loading history…</p>;
  const sessions = db.sessions.filter((s) => s.completed && (planFilter === "all" || (planFilter === "none" ? s.planId === null : s.planId === planFilter)))
    .slice().sort((a, b) => b.endedAt.localeCompare(a.endedAt));
  const planName = (id: string | null) => db.plans.find((p) => p.id === id)?.title ?? "—";
  const taskName = (id: string | null) => db.tasks.find((t) => t.id === id)?.title ?? "—";

  return (
    <div>
      <PageHeader title="Study History" sub="Every entry below is a real recorded session or agent action. Nothing here is estimated or invented." />
      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Total recorded time" value={fmtDuration(totalStudySeconds(db))} />
        <Stat label="Completed sessions" value={String(db.sessions.filter((s) => s.completed).length)} />
        <Stat label="Tasks completed" value={String(db.tasks.filter((t) => t.status === "completed").length)} />
        <Stat label="Agent actions logged" value={String(db.actions.length)} />
      </div>

      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm font-semibold" htmlFor="plan-filter">Filter by plan</label>
        <select id="plan-filter" className="input !w-auto" value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}>
          <option value="all">All plans</option><option value="none">No plan</option>
          {db.plans.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      </div>

      {sessions.length === 0 ? (
        <EmptyState title="No sessions recorded yet" body="Complete a focus session and it will appear here with its real start/end times, duration, and linked task/plan.">
          <Link href="/focus" className="btn-primary">Start a focus session</Link>
        </EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <caption className="sr-only">Recorded study sessions, most recent first</caption>
            <thead><tr style={{ color: "#9fb0d8" }}><th className="px-4 py-3 font-semibold">Date</th><th className="px-4 py-3 font-semibold">Time</th><th className="px-4 py-3 font-semibold">Duration</th><th className="px-4 py-3 font-semibold">Task</th><th className="px-4 py-3 font-semibold">Plan</th></tr></thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-t" style={{ borderColor: "#22315f" }}>
                  <td className="px-4 py-3">{new Date(s.endedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{new Date(s.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {new Date(s.endedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="px-4 py-3 font-semibold">{fmtDuration(s.durationSeconds)}</td>
                  <td className="px-4 py-3">{taskName(s.taskId)}</td>
                  <td className="px-4 py-3">{planName(s.planId)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mb-3 mt-8 font-bold">Recent agent actions</h2>
      {db.actions.length === 0 ? (
        <p className="text-sm" style={{ color: "#9fb0d8" }}>No agent actions yet. Actions taken in the AI Study Agent, plan creation, and task completion are logged here.</p>
      ) : (
        <ul className="card flex flex-col gap-0 p-2">
          {db.actions.slice(0, 15).map((a) => (
            <li key={a.id} className="flex flex-wrap justify-between gap-2 border-b px-3 py-2.5 text-sm last:border-0" style={{ borderColor: "#22315f" }}>
              <span><span className="badge mr-2" style={{ color: a.ok ? "#7df0cd" : "#ffb4c0" }}>{a.tool}</span>{a.summary}</span>
              <time style={{ color: "#9fb0d8" }}>{new Date(a.createdAt).toLocaleString()}</time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
