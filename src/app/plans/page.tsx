"use client";
import { useState } from "react";
import { Archive, CheckCircle2, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { EmptyState, Field, PageHeader, ProgressBar } from "@/components/ui";
import { planProgress, useStore } from "@/lib/store";
import { generatePlanTasks } from "@/lib/agent";
import { PlanStatus, StudyPlan } from "@/lib/types";

type Filter = "all" | PlanStatus;
const blank = { title: "", goal: "", subject: "", description: "", desiredOutcome: "", minutesPerDay: 45, sessionPreference: "Focused sessions", deadline: "", currentLevel: "beginner" };

export default function PlansPage() {
  const { db, ready, addPlan, updatePlan, deletePlan, addTask, logAction } = useStore();
  const [filter, setFilter] = useState<Filter>("active");
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  if (!ready) return <p aria-live="polite">Loading plans…</p>;
  const plans = db.plans.filter((p) => filter === "all" || p.status === filter);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setNotice("");
    if (form.title.trim().length < 3) return setError("Give your plan a title of at least 3 characters.");
    if (form.goal.trim().length < 5) return setError("Describe your goal in at least 5 characters — it drives task generation.");
    if (!form.subject.trim()) return setError("Add a subject or topic.");
    if (form.minutesPerDay < 10 || form.minutesPerDay > 600) return setError("Available study time must be between 10 and 600 minutes per day.");
    if (editing) {
      updatePlan(editing, { ...form });
      logAction("updatePlan", `Updated plan “${form.title}”`, true);
      setNotice(`Plan “${form.title}” updated and saved.`);
      setEditing(null); setForm(blank);
      return;
    }
    const plan = addPlan({ ...form, status: "active" });
    const tasks = generatePlanTasks({ goal: form.goal, subject: form.subject, currentLevel: form.currentLevel, minutesPerDay: form.minutesPerDay, deadline: form.deadline });
    tasks.forEach((t) => addTask({ planId: plan.id, title: t.title, description: t.description, status: "pending", priority: t.priority, dueDate: "", estimatedMinutes: t.estimatedMinutes }));
    logAction("createStudyPlan", `Created plan “${plan.title}” with ${tasks.length} generated tasks`, true);
    setNotice(`Saved plan “${plan.title}” and generated ${tasks.length} tasks (local generator, based on your level and ${form.minutesPerDay} min/day). Edit them any time in My Tasks.`);
    setForm(blank);
  };

  const startEdit = (p: StudyPlan) => {
    setEditing(p.id);
    setForm({ title: p.title, goal: p.goal, subject: p.subject, description: p.description, desiredOutcome: p.desiredOutcome, minutesPerDay: p.minutesPerDay, sessionPreference: p.sessionPreference, deadline: p.deadline, currentLevel: p.currentLevel });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div>
      <PageHeader title="Study Plans" sub="Goals become sequenced, actionable tasks. Progress is calculated from real task completion." />
      {notice && <p role="status" className="card mb-4 p-4 text-sm" style={{ color: "#7df0cd" }}>{notice}</p>}
      {error && <p role="alert" className="card mb-4 p-4 text-sm" style={{ color: "#ffb4c0" }}>{error}</p>}

      <form onSubmit={save} className="card mb-6 p-5" aria-label={editing ? "Edit study plan" : "Create study plan"}>
        <h2 className="mb-4 font-bold">{editing ? "Edit plan" : "Create a new plan"}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Plan title *"><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Biology final in 6 weeks" required /></Field>
          <Field label="Subject / topic *"><input className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Cell biology" required /></Field>
          <div className="sm:col-span-2"><Field label="Learning goal *"><input className="input" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} placeholder="e.g. Score 85%+ on the cell biology final" required /></Field></div>
          <div className="sm:col-span-2"><Field label="Description"><textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Anything useful about this goal (optional)" /></Field></div>
          <Field label="Desired outcome"><input className="input" value={form.desiredOutcome} onChange={(e) => setForm({ ...form, desiredOutcome: e.target.value })} placeholder="e.g. Confidently answer exam questions" /></Field>
          <Field label="Current level">
            <select className="input" value={form.currentLevel} onChange={(e) => setForm({ ...form, currentLevel: e.target.value })}>
              <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
            </select>
          </Field>
          <Field label="Available study time (min/day)"><input className="input" type="number" min={10} max={600} value={form.minutesPerDay} onChange={(e) => setForm({ ...form, minutesPerDay: Number(e.target.value) })} /></Field>
          <Field label="Deadline (optional)"><input className="input" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></Field>
          <Field label="Session preference">
            <select className="input" value={form.sessionPreference} onChange={(e) => setForm({ ...form, sessionPreference: e.target.value })}>
              <option>Focused sessions</option><option>Short daily sessions</option><option>Long weekend sessions</option>
            </select>
          </Field>
        </div>
        <p className="mt-3 text-xs" style={{ color: "#9fb0d8" }}>Assumption: new plans generate 6 sequenced tasks sized to your minutes/day and level. You can edit, reorder by priority, or delete them afterwards.</p>
        <div className="mt-4 flex gap-2">
          <button type="submit" className="btn-primary"><Plus size={16} /> {editing ? "Save changes" : "Create plan & generate tasks"}</button>
          {editing && <button type="button" className="btn-ghost" onClick={() => { setEditing(null); setForm(blank); }}>Cancel edit</button>}
        </div>
      </form>

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter plans by status">
        {(["active", "completed", "archived", "all"] as Filter[]).map((f) => (
          <button key={f} className={filter === f ? "btn-primary !py-1.5 text-sm" : "btn-ghost !py-1.5 text-sm"} onClick={() => setFilter(f)} aria-pressed={filter === f}>{f[0].toUpperCase() + f.slice(1)}</button>
        ))}
      </div>

      {plans.length === 0 ? (
        <EmptyState title={db.plans.length ? "No plans with this status" : "No study plans yet"} body="Create your first plan above — tasks are generated automatically and tracked on your dashboard." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((p) => {
            const prog = planProgress(db, p.id);
            return (
              <article key={p.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div><h3 className="font-bold">{p.title}</h3><p className="text-sm" style={{ color: "#9fb0d8" }}>{p.subject} · {p.currentLevel} · {p.minutesPerDay} min/day{p.deadline ? ` · by ${p.deadline}` : ""}</p></div>
                  <span className="badge" style={{ color: p.status === "active" ? "#7df0cd" : "#9fb0d8" }}>{p.status}</span>
                </div>
                <p className="mt-2 text-sm">{p.goal}</p>
                {p.description && <p className="mt-1 text-sm" style={{ color: "#9fb0d8" }}>{p.description}</p>}
                <div className="mt-3"><ProgressBar pct={prog.pct} label={`Progress for ${p.title}`} /><p className="mt-1.5 text-xs" style={{ color: "#9fb0d8" }}>{prog.done}/{prog.total} tasks · {prog.pct}%</p></div>
                {confirmDelete === p.id ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-sm"><span>Delete this plan? Its tasks stay but become unassigned.</span>
                    <button className="btn-danger !py-1.5 text-sm" onClick={() => { deletePlan(p.id); setConfirmDelete(null); }}>Yes, delete</button>
                    <button className="btn-ghost !py-1.5 text-sm" onClick={() => setConfirmDelete(null)}>Cancel</button></div>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className="btn-ghost !py-1.5 text-sm" onClick={() => startEdit(p)}><Pencil size={14} /> Edit</button>
                    {p.status === "active" && <button className="btn-ghost !py-1.5 text-sm" onClick={() => updatePlan(p.id, { status: "completed" })}><CheckCircle2 size={14} /> Complete</button>}
                    {p.status === "active" && <button className="btn-ghost !py-1.5 text-sm" onClick={() => updatePlan(p.id, { status: "archived" })}><Archive size={14} /> Archive</button>}
                    {p.status !== "active" && <button className="btn-ghost !py-1.5 text-sm" onClick={() => updatePlan(p.id, { status: "active" })}><RotateCcw size={14} /> Reactivate</button>}
                    <button className="btn-danger !py-1.5 text-sm" onClick={() => setConfirmDelete(p.id)}><Trash2 size={14} /> Delete</button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
