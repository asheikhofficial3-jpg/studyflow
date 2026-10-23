"use client";
import { useState } from "react";
import { CheckCircle2, Pencil, PlayCircle, Plus, Trash2 } from "lucide-react";
import { EmptyState, Field, PageHeader, PriorityBadge, StatusBadge } from "@/components/ui";
import { useStore } from "@/lib/store";
import { Priority, Task, TaskStatus } from "@/lib/types";

const blank = { title: "", description: "", priority: "medium" as Priority, dueDate: "", estimatedMinutes: 25, planId: "" };

export default function TasksPage() {
  const { db, ready, addTask, updateTask, deleteTask, completeTask, logAction } = useStore();
  const [filter, setFilter] = useState<"all" | TaskStatus>("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  if (!ready) return <p aria-live="polite">Loading tasks…</p>;
  const tasks = db.tasks.filter((t) => (filter === "all" || t.status === filter) && (planFilter === "all" || (planFilter === "none" ? t.planId === null : t.planId === planFilter)));
  const planName = (id: string | null) => db.plans.find((p) => p.id === id)?.title ?? "No plan";

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.title.trim().length < 3) return setError("Task title needs at least 3 characters.");
    if (form.estimatedMinutes < 1 || form.estimatedMinutes > 1440) return setError("Estimated duration must be 1–1440 minutes.");
    setError("");
    if (editing) { updateTask(editing, { ...form, planId: form.planId || null }); logAction("updateTask", `Updated task “${form.title}”`, true); setEditing(null); }
    else { const t = addTask({ ...form, planId: form.planId || null, status: "pending" }); logAction("addTask", `Added task “${t.title}”`, true); }
    setForm(blank);
  };

  const startEdit = (t: Task) => { setEditing(t.id); setForm({ title: t.title, description: t.description, priority: t.priority, dueDate: t.dueDate, estimatedMinutes: t.estimatedMinutes, planId: t.planId ?? "" }); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <div>
      <PageHeader title="My Tasks" sub="Full task control — completing a task updates its plan's progress and your dashboard immediately." />
      {error && <p role="alert" className="card mb-4 p-4 text-sm" style={{ color: "#ffb4c0" }}>{error}</p>}

      <form onSubmit={save} className="card mb-6 p-5" aria-label={editing ? "Edit task" : "Add task"}>
        <h2 className="mb-4 font-bold">{editing ? "Edit task" : "Add a task"}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title *"><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Revise chapter 4 notes" required /></Field>
          <Field label="Plan">
            <select className="input" value={form.planId} onChange={(e) => setForm({ ...form, planId: e.target.value })}>
              <option value="">No plan</option>
              {db.plans.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </Field>
          <div className="sm:col-span-2"><Field label="Description"><textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What does done look like?" /></Field></div>
          <Field label="Priority">
            <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
          </Field>
          <Field label="Due date (optional)"><input className="input" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></Field>
          <Field label="Estimated minutes"><input className="input" type="number" min={1} max={1440} value={form.estimatedMinutes} onChange={(e) => setForm({ ...form, estimatedMinutes: Number(e.target.value) })} /></Field>
        </div>
        <div className="mt-4 flex gap-2">
          <button type="submit" className="btn-primary"><Plus size={16} /> {editing ? "Save changes" : "Add task"}</button>
          {editing && <button type="button" className="btn-ghost" onClick={() => { setEditing(null); setForm(blank); }}>Cancel edit</button>}
        </div>
      </form>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
          {(["all", "pending", "in-progress", "completed"] as const).map((f) => (
            <button key={f} className={filter === f ? "btn-primary !py-1.5 text-sm" : "btn-ghost !py-1.5 text-sm"} onClick={() => setFilter(f)} aria-pressed={filter === f}>{f === "all" ? "All" : f.replace("-", " ")}</button>
          ))}
        </div>
        <select className="input ml-auto !w-auto" aria-label="Filter by plan" value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}>
          <option value="all">All plans</option><option value="none">No plan</option>
          {db.plans.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      </div>

      {tasks.length === 0 ? (
        <EmptyState title="No tasks match" body={db.tasks.length ? "Try a different filter, or add a task above." : "Add your first task above, create a plan to generate tasks automatically, or ask the AI Agent."} />
      ) : (
        <ul className="flex flex-col gap-3">
          {tasks.map((t) => (
            <li key={t.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={`font-semibold ${t.status === "completed" ? "line-through opacity-60" : ""}`}>{t.title}</p>
                  {t.description && <p className="mt-0.5 text-sm" style={{ color: "#9fb0d8" }}>{t.description}</p>}
                  <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs" style={{ color: "#9fb0d8" }}>
                    <span>{planName(t.planId)}</span><span>· ~{t.estimatedMinutes} min</span>{t.dueDate && <span>· due {t.dueDate}</span>}
                    <PriorityBadge p={t.priority} /><StatusBadge s={t.status} />
                  </p>
                </div>
                {confirmDelete === t.id ? (
                  <span className="flex items-center gap-2 text-sm"><span>Delete?</span>
                    <button className="btn-danger !py-1.5 text-sm" onClick={() => { deleteTask(t.id); setConfirmDelete(null); }}>Yes</button>
                    <button className="btn-ghost !py-1.5 text-sm" onClick={() => setConfirmDelete(null)}>Cancel</button></span>
                ) : (
                  <span className="flex flex-wrap gap-2">
                    {t.status === "pending" && <button className="btn-ghost !py-1.5 text-sm" onClick={() => updateTask(t.id, { status: "in-progress" })}><PlayCircle size={14} /> Start</button>}
                    {t.status !== "completed" && <button className="btn-ghost !py-1.5 text-sm" onClick={() => { completeTask(t.id); logAction("completeTask", `Completed task “${t.title}”`, true); }}><CheckCircle2 size={14} /> Complete</button>}
                    {t.status === "completed" && <button className="btn-ghost !py-1.5 text-sm" onClick={() => updateTask(t.id, { status: "pending" })}>Reopen</button>}
                    <button className="btn-ghost !py-1.5 text-sm" onClick={() => startEdit(t)} aria-label={`Edit ${t.title}`}><Pencil size={14} /></button>
                    <button className="btn-danger !py-1.5 text-sm" onClick={() => setConfirmDelete(t.id)} aria-label={`Delete ${t.title}`}><Trash2 size={14} /></button>
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-sm" style={{ color: "#9fb0d8" }}>{db.tasks.filter((t) => t.status === "completed").length} of {db.tasks.length} tasks completed.</p>
    </div>
  );
}
