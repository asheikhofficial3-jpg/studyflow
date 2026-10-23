"use client";
import Link from "next/link";
import { PageHeader, ProgressBar, Stat } from "@/components/ui";
import { fmtDuration, planProgress, studyStreak, totalStudySeconds, useStore } from "@/lib/store";
import { suggestNextStep } from "@/lib/agent";

export default function ProgressPage() {
  const { db, ready } = useStore();
  if (!ready) return <p aria-live="polite">Loading progress…</p>;

  // Last 7 days of real recorded study time
  const days: { label: string; key: string; seconds: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const seconds = db.sessions.filter((s) => s.completed && s.endedAt.slice(0, 10) === key).reduce((a, s) => a + s.durationSeconds, 0);
    days.push({ label: d.toLocaleDateString(undefined, { weekday: "short" }), key, seconds });
  }
  const max = Math.max(...days.map((d) => d.seconds), 1);
  const weekSeconds = days.reduce((a, d) => a + d.seconds, 0);
  const done = db.tasks.filter((t) => t.status === "completed").length;
  const hasData = db.sessions.some((s) => s.completed) || db.tasks.length > 0;

  // Last 4 weeks trend
  const weeks = [3, 2, 1, 0].map((w) => {
    const start = new Date(); start.setDate(start.getDate() - (w * 7 + 6));
    const end = new Date(); end.setDate(end.getDate() - w * 7);
    const s = db.sessions.filter((x) => x.completed && new Date(x.endedAt) >= start && new Date(x.endedAt) <= new Date(end.toISOString().slice(0, 10) + "T23:59:59")).reduce((a, x) => a + x.durationSeconds, 0);
    return { label: w === 0 ? "This week" : `${w}w ago`, seconds: s };
  });

  return (
    <div>
      <PageHeader title="Progress" sub="Measured data only — totals come from your recorded sessions and completed tasks, never estimates." />
      {!hasData ? (
        <div className="card p-8 text-center">
          <p className="text-lg font-bold">Not enough data yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm" style={{ color: "#9fb0d8" }}>Complete a task or a focus session and your real trends, streak, and plan progress will appear here.</p>
          <div className="mt-4 flex justify-center gap-2"><Link href="/focus" className="btn-primary">Start focusing</Link><Link href="/tasks" className="btn-ghost">View tasks</Link></div>
        </div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
            <Stat label="Total study time" value={fmtDuration(totalStudySeconds(db))} hint="Completed sessions" />
            <Stat label="This week" value={fmtDuration(weekSeconds)} hint={`Daily goal: ${db.preferences.dailyGoalMinutes}m`} />
            <Stat label="Tasks completed" value={`${done}/${db.tasks.length}`} />
            <Stat label="Day streak" value={`${studyStreak(db)}`} hint="Consecutive days with a session" />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="card p-5">
              <h2 className="mb-1 font-bold">Last 7 days</h2>
              <p className="mb-4 text-xs" style={{ color: "#9fb0d8" }}>Recorded minutes per day. Text values are provided for accessibility.</p>
              <div className="flex h-36 items-end gap-2" role="img" aria-label={`Bar chart of study minutes for the last 7 days: ${days.map((d) => `${d.label} ${Math.round(d.seconds / 60)} minutes`).join(", ")}`}>
                {days.map((d) => (
                  <div key={d.key} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="text-[11px] font-semibold">{Math.round(d.seconds / 60)}m</span>
                    <div className="w-full rounded-t-lg" style={{ height: `${Math.max(4, (d.seconds / max) * 96)}px`, background: d.seconds ? "linear-gradient(180deg,#7df0cd,#1fd6a2)" : "#1b2c5c" }} />
                    <span className="text-[11px]" style={{ color: "#9fb0d8" }}>{d.label}</span>
                  </div>
                ))}
              </div>
              <ul className="sr-only">{days.map((d) => <li key={d.key}>{d.label}: {Math.round(d.seconds / 60)} minutes</li>)}</ul>
            </div>

            <div className="card p-5">
              <h2 className="mb-4 font-bold">Weekly trend</h2>
              <ul className="flex flex-col gap-3">
                {weeks.map((w) => (
                  <li key={w.label} className="flex items-center justify-between text-sm"><span style={{ color: "#9fb0d8" }}>{w.label}</span><span className="font-bold">{fmtDuration(w.seconds)}</span></li>
                ))}
              </ul>
              <h3 className="mb-2 mt-6 font-bold">Recommended next step</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#9fb0d8" }}>{suggestNextStep(db)}</p>
              <Link href="/agent" className="btn-ghost mt-3 text-sm">Discuss with the agent</Link>
            </div>
          </div>

          <div className="card mt-5 p-5">
            <h2 className="mb-4 font-bold">Plan progress</h2>
            {db.plans.length === 0 ? <p className="text-sm" style={{ color: "#9fb0d8" }}>No plans yet.</p> : (
              <ul className="flex flex-col gap-4">
                {db.plans.map((p) => { const pr = planProgress(db, p.id); return (
                  <li key={p.id}>
                    <div className="mb-1.5 flex justify-between gap-3 text-sm"><span className="font-semibold">{p.title} <span className="badge ml-1">{p.status}</span></span><span style={{ color: "#7df0cd" }}>{pr.done}/{pr.total} · {pr.pct}%</span></div>
                    <ProgressBar pct={pr.pct} label={`Progress for ${p.title}`} />
                  </li> ); })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
