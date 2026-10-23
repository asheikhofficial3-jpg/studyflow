import { DB, Priority, StudyPlan, Task } from "./types";
import { fmtDuration, planProgress, totalStudySeconds } from "./store";

export interface ToolResult { ok: boolean; summary: string; error?: string }

/** Deterministic milestone/task generator — labelled as a local generator, never as live AI. */
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
  return phases.map(([title, description, priority]) => ({ title: `${subj}: ${title}`, description, priority, estimatedMinutes: per }));
}

export function suggestNextStep(db: DB): string {
  const inProg = db.tasks.find((t) => t.status === "in-progress");
  if (inProg) return `Continue “${inProg.title}” — it's already in progress. A ${db.preferences.defaultFocusMinutes}-minute focus session is a good next step.`;
  const next = db.tasks.filter((t) => t.status === "pending").sort((a, b) => {
    const rank: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
    return rank[a.priority] - rank[b.priority] || a.createdAt.localeCompare(b.createdAt);
  })[0];
  if (next) return `Start “${next.title}” (${next.priority} priority, ~${next.estimatedMinutes} min). It's your highest-priority pending task.`;
  const active = db.plans.find((p) => p.status === "active");
  if (active) return `All tasks for “${active.title}” are done or none exist yet. Ask me to break the goal into tasks, or add one from My Tasks.`;
  if (!db.plans.length) return "You don't have a study plan yet. Create one in Study Plans, or tell me your goal here and I'll generate a plan with tasks.";
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
    db.memory.difficulties.length ? `Reported difficulties: ${db.memory.difficulties.join("; ")}.` : "No difficulties reported yet.",
  ].join(" ");
}

/**
 * Local rule-based agent fallback. Clearly labelled in the UI.
 * Parses intent and executes REAL tools against the store via callbacks.
 */
export interface AgentHandlers {
  createPlanWithTasks: (plan: Omit<StudyPlan, "id" | "createdAt" | "updatedAt" | "status">, tasks: ReturnType<typeof generatePlanTasks>) => { plan: StudyPlan; tasks: Task[] };
  addTask: (t: Omit<Task, "id" | "createdAt" | "updatedAt" | "completedAt">) => Task;
  completeFirstMatching: (query: string) => Task | null;
}

export function handleAgentMessage(db: DB, raw: string, h: AgentHandlers): { reply: string; tool?: string } {
  const msg = raw.trim();
  const low = msg.toLowerCase();

  if (/^(hi|hello|hey)\b/.test(low)) {
    return { reply: `Hi${db.preferences.displayName ? ` ${db.preferences.displayName}` : ""}! I'm running in local fallback mode (no live AI key configured), but I can still act: try “Create a plan to learn [topic]”, “Show my pending tasks”, “Add task: …”, “Complete task: …”, “Summarize my history”, or “What should I do next?”` };
  }
  if (low.includes("next") && (low.includes("what") || low.includes("should") || low.includes("recommend"))) {
    return { reply: suggestNextStep(db), tool: "suggestNextStep" };
  }
  if (low.includes("pending") || low.includes("show my tasks") || low.includes("list tasks") || low.includes("my tasks")) {
    const pending = db.tasks.filter((t) => t.status !== "completed");
    if (!pending.length) return { reply: "You have no pending tasks. Create a plan or add a task and I'll track it here.", tool: "listTasks" };
    return { reply: `Here are your pending tasks (${pending.length}):\n${pending.slice(0, 8).map((t, i) => `${i + 1}. ${t.title} — ${t.priority} priority, ~${t.estimatedMinutes} min`).join("\n")}`, tool: "listTasks" };
  }
  if (low.includes("history") || low.includes("summar")) {
    const sessions = db.sessions.filter((s) => s.completed);
    if (!sessions.length) return { reply: "No completed focus sessions recorded yet. Start one from Focus Session and it will appear in your history and progress.", tool: "getStudyHistory" };
    const recent = sessions.slice(0, 5).map((s) => `• ${new Date(s.endedAt).toLocaleDateString()} — ${fmtDuration(s.durationSeconds)}`).join("\n");
    return { reply: `You've recorded ${fmtDuration(totalStudySeconds(db))} across ${sessions.length} session(s).\nRecent:\n${recent}`, tool: "getStudyHistory" };
  }
  if (low.startsWith("complete task:") || low.startsWith("complete:")) {
    const q = msg.slice(msg.indexOf(":") + 1).trim();
    const done = h.completeFirstMatching(q);
    if (!done) return { reply: `I couldn't find a pending task matching “${q}”. Check the exact title in My Tasks.`, tool: "completeTask" };
    return { reply: `Done — marked “${done.title}” as completed. Plan progress and your dashboard have been updated.`, tool: "completeTask" };
  }
  if (low.startsWith("add task:") || low.startsWith("add a task:") || low.startsWith("new task:")) {
    const title = msg.slice(msg.indexOf(":") + 1).trim();
    if (title.length < 3) return { reply: "Please give the task a title of at least 3 characters, e.g. “Add task: Revise photosynthesis notes”.", tool: "addTask" };
    const t = h.addTask({ planId: db.plans.find((p) => p.status === "active")?.id ?? null, title, description: "Added from the AI Study Agent.", status: "pending", priority: "medium", dueDate: "", estimatedMinutes: db.preferences.defaultFocusMinutes });
    return { reply: `Added task “${t.title}”${t.planId ? " to your active plan" : ""}. You can edit its priority and due date in My Tasks.`, tool: "addTask" };
  }
  if (low.includes("difficult") || low.includes("struggling") || low.includes("hard time")) {
    return { reply: `Noted — I've saved that difficulty to your study memory so future recommendations can account for it. ${suggestNextStep(db)}`, tool: "getStudyContext" };
  }
  const planMatch = msg.match(/create (?:a )?plan(?: to| for)?\s+(.+)/i) || msg.match(/plan (?:to|for)\s+(.+)/i) || msg.match(/learn\s+(.+)/i);
  if (planMatch) {
    const goal = planMatch[1].replace(/[.!]+$/, "").trim();
    const subject = goal.replace(/^learn\s+/i, "");
    const tasks = generatePlanTasks({ goal, subject, currentLevel: "beginner", minutesPerDay: 45, deadline: "" });
    const { plan } = h.createPlanWithTasks(
      { title: goal.charAt(0).toUpperCase() + goal.slice(1), goal, subject, description: `Plan generated locally for: ${goal}`, desiredOutcome: `Make steady, measurable progress on ${subject}.`, minutesPerDay: 45, sessionPreference: "Focused sessions", deadline: "", currentLevel: "beginner" },
      tasks
    );
    const prog = planProgress(db, plan.id);
    void prog;
    return { reply: `Created plan “${plan.title}” with ${tasks.length} tasks (local generator — edit any of them in Study Plans / My Tasks):\n${tasks.map((t, i) => `${i + 1}. ${t.title} (~${t.estimatedMinutes} min)`).join("\n")}\nNext: ${suggestNextStep({ ...db, plans: [plan, ...db.plans], tasks: [...tasks.map((t, i) => ({ ...t, id: `tmp-${i}`, planId: plan.id, status: "pending" as const, dueDate: "", createdAt: "", updatedAt: "", completedAt: null })), ...db.tasks] })}`, tool: "createStudyPlan" };
  }
  if (low.includes("context") || low.includes("progress")) {
    return { reply: getStudyContext(db), tool: "getStudyContext" };
  }
  return { reply: `I can act on that in local fallback mode. Try one of these:\n• “Create a plan to learn Spanish verbs”\n• “Add task: Revise chapter 4”\n• “Show my pending tasks”\n• “Complete task: <title>”\n• “Summarize my history”\n• “What should I do next?”\n\nYour context right now: ${getStudyContext(db)}` };
}
