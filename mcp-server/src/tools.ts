/**
 * StudyFlow agent tool implementations for the MCP server.
 * Same tool semantics as the StudyFlow web app's local agent
 * (src/lib/agent.ts): every call executes against the real store,
 * persists, and returns a structured result.
 */
import {
  DB, Priority, StudyPlan, Task,
  defaultDB, fmtDuration, logAction, nowISO, planProgress, totalStudySeconds, uid,
} from "./db.js";

/** Deterministic milestone/task generator — labelled as local, never as live AI. */
export function generatePlanTasks(input: {
  goal: string; subject: string; currentLevel: string; minutesPerDay: number; deadline: string;
}): { title: string; description: string; priority: Priority; estimatedMinutes: number }[] {
  const subj = input.subject || input.goal;
  const level = (input.currentLevel || "beginner").toLowerCase();
  const per = Math.max(15, input.minutesPerDay || 45);
  const phases: [string, string, Priority][] = level.includes("advanced")
    ? [
        ["Map gaps & set targets", `Audit what you already know in ${subj} and list the weakest areas for "${input.goal}".`, "high"],
        ["Deep-work block: hardest topic first", `Focused study on the hardest subtopic of ${subj}, with worked examples and notes.`, "high"],
        ["Timed practice set", `Complete a timed practice set for ${subj} and log every mistake with a correction.`, "high"],
        ["Teach-back & summary", `Explain the key ideas of ${subj} out loud or in writing as if teaching someone else.`, "medium"],
        ["Review mistakes & spaced recap", `Revisit your mistake log and re-test the items you got wrong.`, "medium"],
        ["Full mock / final check", `Simulate the real outcome for "${input.goal}" under timed conditions and review the result.`, "high"],
      ]
    : [
        ["Foundations: core concepts", `Learn the essential vocabulary and core concepts of ${subj} needed for "${input.goal}". Take short notes.`, "high"],
        ["Guided examples & walkthroughs", `Work through beginner-friendly examples for ${subj} step by step, then repeat one without looking.`, "high"],
        ["Practice: easy problems", `Complete a small set of easy practice items for ${subj}. Note anything that feels difficult.`, "medium"],
        ["Practice: mixed difficulty", `Try mixed questions for ${subj} and write down the exact step where you get stuck.`, "medium"],
        ["Review & fill gaps", `Re-study the topics you struggled with and redo the questions you missed.`, "high"],
        ["Checkpoint: mini-test & reflect", `Take a short self-test on ${subj}, score it honestly, and note what to revise next.`, "medium"],
      ];
  return phases.map(([title, description, priority]) => ({
    title: `${subj}: ${title}`,
    description,
    priority,
    estimatedMinutes: per,
  }));
}

export function suggestNextStep(db: DB): string {
  const inProg = db.tasks.find((t) => t.status === "in-progress");
  if (inProg)
    return `Continue "${inProg.title}" — it's already in progress. A ${db.preferences.defaultFocusMinutes}-minute focus session is a good next step.`;
  const next = db.tasks
    .filter((t) => t.status === "pending")
    .sort((a, b) => {
      const rank: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
      return rank[a.priority] - rank[b.priority] || a.createdAt.localeCompare(b.createdAt);
    })[0];
  if (next)
    return `Start "${next.title}" (${next.priority} priority, ~${next.estimatedMinutes} min). It's your highest-priority pending task.`;
  const active = db.plans.find((p) => p.status === "active");
  if (active)
    return `All tasks for "${active.title}" are done or none exist yet. Create more tasks with addTask, or ask for a new plan.`;
  if (!db.plans.length)
    return "No study plan yet. Use createStudyPlan with your goal and I'll generate a plan with sequenced tasks.";
  return "Everything is complete — nice work. Create a new plan to keep the momentum going.";
}

export function getStudyContext(db: DB): string {
  const active = db.plans.filter((p) => p.status === "active");
  const pending = db.tasks.filter((t) => t.status !== "completed").length;
  const done = db.tasks.filter((t) => t.status === "completed").length;
  return [
    `Active plans: ${active.length ? active.map((p) => p.title).join(", ") : "none"}.`,
    `Tasks: ${pending} pending, ${done} completed.`,
    `Recorded study time: ${fmtDuration(totalStudySeconds(db))} across ${db.sessions.filter((s) => s.completed).length} completed session(s).`,
    db.memory.difficulties.length
      ? `Reported difficulties: ${db.memory.difficulties.join("; ")}.`
      : "No difficulties reported yet.",
  ].join(" ");
}

// ---- Tool handlers: each mutates the DB, logs an audit entry, returns a result ----

export interface ToolResult {
  ok: boolean;
  summary: string;
  data?: unknown;
  error?: string;
}

export function createStudyPlan(
  db: DB,
  input: { goal: string; subject?: string; currentLevel?: string; minutesPerDay?: number; deadline?: string }
): ToolResult {
  const goal = (input.goal ?? "").trim();
  if (goal.length < 3) return { ok: false, summary: "Goal must be at least 3 characters.", error: "goal_too_short" };
  const subject = (input.subject ?? goal).trim() || goal;
  const currentLevel = (input.currentLevel ?? "beginner").trim() || "beginner";
  const minutesPerDay = Math.min(180, Math.max(15, Math.round(input.minutesPerDay ?? 45)));
  const deadline = (input.deadline ?? "").trim();

  const plan: StudyPlan = {
    id: uid(),
    title: goal.charAt(0).toUpperCase() + goal.slice(1),
    goal,
    subject,
    description: `Plan generated by the StudyFlow MCP server for: ${goal}`,
    desiredOutcome: `Make steady, measurable progress on ${subject}.`,
    minutesPerDay,
    sessionPreference: "Focused sessions",
    deadline,
    currentLevel,
    status: "active",
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  const tasks: Task[] = generatePlanTasks({ goal, subject, currentLevel, minutesPerDay, deadline }).map((t) => ({
    ...t,
    id: uid(),
    planId: plan.id,
    status: "pending" as const,
    dueDate: "",
    createdAt: nowISO(),
    updatedAt: nowISO(),
    completedAt: null,
  }));
  db.plans = [plan, ...db.plans];
  db.tasks = [...tasks, ...db.tasks];
  const summary = `Created plan "${plan.title}" with ${tasks.length} sequenced tasks (${minutesPerDay} min/day, level: ${currentLevel}).`;
  logAction(db, "createStudyPlan", summary, true);
  return { ok: true, summary, data: { plan, tasks } };
}

export function addTask(
  db: DB,
  input: { title: string; description?: string; planId?: string | null; priority?: Priority; dueDate?: string; estimatedMinutes?: number }
): ToolResult {
  const title = (input.title ?? "").trim();
  if (title.length < 3) return { ok: false, summary: "Task title must be at least 3 characters.", error: "title_too_short" };
  const priority: Priority = input.priority === "high" || input.priority === "low" ? input.priority : "medium";
  let planId: string | null = input.planId ?? null;
  if (planId && !db.plans.some((p) => p.id === planId)) {
    return { ok: false, summary: `No plan found with id "${planId}".`, error: "plan_not_found" };
  }
  if (!planId) planId = db.plans.find((p) => p.status === "active")?.id ?? null;
  const task: Task = {
    id: uid(),
    planId,
    title,
    description: (input.description ?? "").trim(),
    status: "pending",
    priority,
    dueDate: (input.dueDate ?? "").trim(),
    estimatedMinutes: Math.max(5, Math.round(input.estimatedMinutes ?? db.preferences.defaultFocusMinutes)),
    createdAt: nowISO(),
    updatedAt: nowISO(),
    completedAt: null,
  };
  db.tasks = [task, ...db.tasks];
  const summary = `Added task "${task.title}"${planId ? " to the active plan" : ""} (${priority} priority, ~${task.estimatedMinutes} min).`;
  logAction(db, "addTask", summary, true);
  return { ok: true, summary, data: { task } };
}

export function listTasks(db: DB, input: { status?: string }): ToolResult {
  const status = (input.status ?? "").trim();
  const tasks = status ? db.tasks.filter((t) => t.status === status) : db.tasks;
  const summary = status
    ? `${tasks.length} task(s) with status "${status}".`
    : `${db.tasks.length} task(s) total.`;
  logAction(db, "listTasks", summary, true);
  return { ok: true, summary, data: { tasks } };
}

export function updateTask(
  db: DB,
  input: { id: string; title?: string; description?: string; status?: string; priority?: string; dueDate?: string; estimatedMinutes?: number; planId?: string | null }
): ToolResult {
  const task = db.tasks.find((t) => t.id === input.id);
  if (!task) return { ok: false, summary: `No task found with id "${input.id}".`, error: "task_not_found" };
  const patch: Partial<Task> = {};
  if (input.title !== undefined) {
    if (input.title.trim().length < 3) return { ok: false, summary: "Task title must be at least 3 characters.", error: "title_too_short" };
    patch.title = input.title.trim();
  }
  if (input.description !== undefined) patch.description = input.description.trim();
  if (input.status !== undefined) {
    if (!["pending", "in-progress", "completed"].includes(input.status))
      return { ok: false, summary: `Invalid status "${input.status}".`, error: "invalid_status" };
    patch.status = input.status as Task["status"];
    patch.completedAt = input.status === "completed" ? task.completedAt ?? nowISO() : null;
  }
  if (input.priority !== undefined) {
    if (!["low", "medium", "high"].includes(input.priority))
      return { ok: false, summary: `Invalid priority "${input.priority}".`, error: "invalid_priority" };
    patch.priority = input.priority as Priority;
  }
  if (input.dueDate !== undefined) patch.dueDate = input.dueDate.trim();
  if (input.estimatedMinutes !== undefined) patch.estimatedMinutes = Math.max(5, Math.round(input.estimatedMinutes));
  if (input.planId !== undefined) {
    if (input.planId !== null && !db.plans.some((p) => p.id === input.planId))
      return { ok: false, summary: `No plan found with id "${input.planId}".`, error: "plan_not_found" };
    patch.planId = input.planId;
  }
  Object.assign(task, patch, { updatedAt: nowISO() });
  const summary = `Updated task "${task.title}"${patch.status ? ` (status: ${patch.status})` : ""}.`;
  logAction(db, "updateTask", summary, true);
  return { ok: true, summary, data: { task } };
}

export function completeTask(db: DB, input: { id?: string; query?: string }): ToolResult {
  let task: Task | undefined;
  if (input.id) {
    task = db.tasks.find((t) => t.id === input.id);
  } else if (input.query) {
    const q = input.query.trim().toLowerCase();
    task = db.tasks.find((t) => t.status !== "completed" && t.title.toLowerCase().includes(q));
  } else {
    return { ok: false, summary: "Provide either a task id or a title query.", error: "missing_identifier" };
  }
  if (!task) return { ok: false, summary: "No matching pending task found.", error: "task_not_found" };
  task.status = "completed";
  task.completedAt = task.completedAt ?? nowISO();
  task.updatedAt = nowISO();
  const progress = task.planId ? planProgress(db, task.planId) : null;
  const summary = `Completed task "${task.title}".${progress !== null ? ` Plan progress: ${progress}%.` : ""}`;
  logAction(db, "completeTask", summary, true);
  return { ok: true, summary, data: { task, planProgress: progress } };
}

export function getStudyHistory(db: DB, input: { limit?: number }): ToolResult {
  const limit = Math.min(50, Math.max(1, Math.round(input.limit ?? 10)));
  const sessions = db.sessions.filter((s) => s.completed).slice(0, limit);
  const total = fmtDuration(totalStudySeconds(db));
  const summary = sessions.length
    ? `${sessions.length} completed session(s), ${total} total study time.`
    : "No completed focus sessions recorded yet.";
  logAction(db, "getStudyHistory", summary, true);
  return { ok: true, summary, data: { sessions, totalStudyTime: total, sessionCount: db.sessions.filter((s) => s.completed).length } };
}

export function getStudyContextHandler(db: DB): ToolResult {
  const context = getStudyContext(db);
  logAction(db, "getStudyContext", "Retrieved study context.", true);
  return { ok: true, summary: context, data: { context } };
}

export function suggestNextStepHandler(db: DB): ToolResult {
  const recommendation = suggestNextStep(db);
  db.memory.lastRecommendation = recommendation;
  logAction(db, "suggestNextStep", "Generated next-step recommendation.", true);
  return { ok: true, summary: recommendation, data: { recommendation } };
}

export { defaultDB };
