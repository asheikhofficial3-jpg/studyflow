"use client";
import { Priority, TaskStatus } from "@/lib/types";

export function PageHeader({ title, sub, action }: { title: string; sub: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1><p className="mt-1 text-sm" style={{ color: "#9fb0d8" }}>{sub}</p></div>
      {action}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#9fb0d8" }}>{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
      {hint && <p className="mt-1 text-xs" style={{ color: "#9fb0d8" }}>{hint}</p>}
    </div>
  );
}

export function PriorityBadge({ p }: { p: Priority }) {
  const colors: Record<Priority, string> = { high: "#ffb4c0", medium: "#ffd98a", low: "#7df0cd" };
  return <span className="badge" style={{ color: colors[p] }}>{p}</span>;
}

export function StatusBadge({ s }: { s: TaskStatus | string }) {
  return <span className="badge" style={{ color: s === "completed" ? "#7df0cd" : s === "in-progress" ? "#9a8cff" : "#c9d6f5" }}>{String(s).replace("-", " ")}</span>;
}

export function ProgressBar({ pct, label }: { pct: number; label: string }) {
  return (
    <div>
      <div className="progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </div>
      <span className="sr-only">{label}: {pct}%</span>
    </div>
  );
}

export function EmptyState({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="card p-8 text-center">
      <p className="text-lg font-bold">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm" style={{ color: "#9fb0d8" }}>{body}</p>
      {children && <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      {children}
    </label>
  );
}
