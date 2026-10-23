/**
 * File-backed JSON store for the StudyFlow MCP server.
 * Uses the exact same DB shape as the StudyFlow web app
 * (src/lib/types.ts), persisted to a local JSON file.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { randomUUID } from "crypto";

export type Priority = "low" | "medium" | "high";
export type TaskStatus = "pending" | "in-progress" | "completed";
export type PlanStatus = "active" | "completed" | "archived";

export interface UserPreferences {
  displayName: string;
  defaultFocusMinutes: number;
  dailyGoalMinutes: number;
  notifications: boolean;
  reducedMotion: boolean;
}

export interface StudyPlan {
  id: string;
  title: string;
  goal: string;
  subject: string;
  description: string;
  desiredOutcome: string;
  minutesPerDay: number;
  sessionPreference: string;
  deadline: string;
  currentLevel: string;
  status: PlanStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  planId: string | null;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string;
  estimatedMinutes: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface StudySession {
  id: string;
  taskId: string | null;
  planId: string | null;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  plannedMinutes: number;
  completed: boolean;
}

export interface AgentAction {
  id: string;
  tool: string;
  summary: string;
  ok: boolean;
  createdAt: string;
}

export interface StudyMemory {
  difficulties: string[];
  notes: string[];
  lastRecommendation: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
}

export interface DB {
  preferences: UserPreferences;
  plans: StudyPlan[];
  tasks: Task[];
  sessions: StudySession[];
  actions: AgentAction[];
  memory: StudyMemory;
  chat: ChatMessage[];
}

export const uid = () => randomUUID();
export const nowISO = () => new Date().toISOString();

export function defaultDB(): DB {
  return {
    preferences: {
      displayName: "",
      defaultFocusMinutes: 25,
      dailyGoalMinutes: 60,
      notifications: false,
      reducedMotion: false,
    },
    plans: [],
    tasks: [],
    sessions: [],
    actions: [],
    memory: { difficulties: [], notes: [], lastRecommendation: "" },
    chat: [],
  };
}

function dbPath(): string {
  return resolve(
    process.env.STUDYFLOW_MCP_DB ??
      resolve(dirname(new URL(import.meta.url).pathname), "..", "data", "studyflow-db.json")
  );
}

export function loadDB(): DB {
  const path = dbPath();
  try {
    if (existsSync(path)) {
      const parsed = JSON.parse(readFileSync(path, "utf8")) as DB;
      return { ...defaultDB(), ...parsed };
    }
  } catch {
    // Corrupt file: start clean rather than crash.
  }
  return defaultDB();
}

export function saveDB(db: DB): void {
  const path = dbPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(db, null, 2), "utf8");
}

/** Append a tool invocation to the agent action audit log (max 100). */
export function logAction(db: DB, tool: string, summary: string, ok: boolean): void {
  db.actions = [
    { id: uid(), tool, summary, ok, createdAt: nowISO() },
    ...db.actions,
  ].slice(0, 100);
}

export function fmtDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.round((totalSeconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function totalStudySeconds(db: DB): number {
  return db.sessions.filter((s) => s.completed).reduce((a, s) => a + s.durationSeconds, 0);
}

export function planProgress(db: DB, planId: string): number {
  const tasks = db.tasks.filter((t) => t.planId === planId);
  if (!tasks.length) return 0;
  return Math.round((tasks.filter((t) => t.status === "completed").length / tasks.length) * 100);
}
