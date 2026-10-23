import { describe, expect, it } from "vitest";
import { generatePlanTasks, getStudyContext, handleAgentMessage, suggestNextStep } from "./agent";
import { fmtDuration, planProgress, studyStreak, totalStudySeconds } from "./store";
import { DB, defaultDB } from "./types";

const base = (): DB => defaultDB();
const task = (over: Partial<DB["tasks"][number]>): DB["tasks"][number] => ({
  id: "t1", planId: "p1", title: "Revise notes", description: "", status: "pending",
  priority: "medium", dueDate: "", estimatedMinutes: 30,
  createdAt: "2026-10-20T10:00:00.000Z", updatedAt: "2026-10-20T10:00:00.000Z", completedAt: null, ...over,
});
const session = (endedAt: string, secs: number): DB["sessions"][number] => ({
  id: `s-${endedAt}-${secs}`, taskId: null, planId: null,
  startedAt: endedAt, endedAt, durationSeconds: secs, plannedMinutes: 25, completed: true,
});

describe("generatePlanTasks", () => {
  it("generates 6 sequenced tasks sized to minutes/day", () => {
    const tasks = generatePlanTasks({ goal: "Pass biology final", subject: "Biology", currentLevel: "beginner", minutesPerDay: 40, deadline: "" });
    expect(tasks).toHaveLength(6);
    expect(tasks.every((t) => t.estimatedMinutes === 40)).toBe(true);
    expect(tasks[0].title).toContain("Biology");
  });
  it("uses advanced phases for advanced learners and enforces a 15-min floor", () => {
    const tasks = generatePlanTasks({ goal: "g", subject: "Maths", currentLevel: "advanced", minutesPerDay: 5, deadline: "" });
    expect(tasks[0].title).toContain("Map gaps");
    expect(tasks.every((t) => t.estimatedMinutes === 15)).toBe(true);
  });
});

describe("derived metrics use real records only", () => {
  it("planProgress counts completed tasks", () => {
    const db = base();
    db.tasks = [task({}), task({ id: "t2", status: "completed" }), task({ id: "t3", planId: "other" })];
    expect(planProgress(db, "p1")).toEqual({ done: 1, total: 2, pct: 50 });
    expect(planProgress(db, "missing")).toEqual({ done: 0, total: 0, pct: 0 });
  });
  it("totalStudySeconds ignores uncompleted sessions", () => {
    const db = base();
    db.sessions = [session("2026-10-21T10:00:00.000Z", 1500), { ...session("2026-10-21T11:00:00.000Z", 900), completed: false }];
    expect(totalStudySeconds(db)).toBe(1500);
  });
  it("studyStreak is 0 with no sessions and counts consecutive days ending today/yesterday", () => {
    expect(studyStreak(base())).toBe(0);
    const db = base();
    const today = new Date().toISOString().slice(0, 10);
    const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    db.sessions = [session(`${today}T10:00:00.000Z`, 600), session(`${y}T10:00:00.000Z`, 600)];
    expect(studyStreak(db)).toBe(2);
  });
  it("fmtDuration formats minutes and hours", () => {
    expect(fmtDuration(0)).toBe("0m");
    expect(fmtDuration(2700)).toBe("45m");
    expect(fmtDuration(7500)).toBe("2h 5m");
  });
});

describe("agent fallback tools", () => {
  it("suggestNextStep prioritises in-progress, then high-priority pending, then plan creation", () => {
    expect(suggestNextStep(base())).toContain("don't have a study plan");
    const db = base();
    db.tasks = [task({ priority: "low" }), task({ id: "t2", title: "Urgent essay", priority: "high" })];
    expect(suggestNextStep(db)).toContain("Urgent essay");
    db.tasks[0].status = "in-progress";
    expect(suggestNextStep(db)).toContain("Revise notes");
  });
  it("handleAgentMessage lists pending tasks and reports empty state honestly", () => {
    const handlers = {
      createPlanWithTasks: () => { throw new Error("unused"); },
      addTask: () => { throw new Error("unused"); },
      completeFirstMatching: () => null,
    };
    expect(handleAgentMessage(base(), "Show my pending tasks", handlers).reply).toContain("no pending tasks");
    const db = base(); db.tasks = [task({})];
    expect(handleAgentMessage(db, "Show my pending tasks", handlers).reply).toContain("Revise notes");
  });
  it("getStudyContext summarises real counts", () => {
    const db = base(); db.tasks = [task({}), task({ id: "t2", status: "completed" })];
    const ctx = getStudyContext(db);
    expect(ctx).toContain("1 pending, 1 completed");
  });
});
