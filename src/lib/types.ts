export type Priority = "low" | "medium" | "high";
export type TaskStatus = "pending" | "in-progress" | "completed";
export type PlanStatus = "active" | "completed" | "archived";
export type OrbState = "idle" | "listening" | "planning" | "executing" | "success" | "error";

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
  deadline: string; // ISO date or ""
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

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const nowISO = () => new Date().toISOString();

export const defaultDB = (): DB => ({
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
});
