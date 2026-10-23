"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DB, StudyPlan, StudySession, Task, defaultDB, nowISO, uid } from "./types";

const KEY = "studyflow-db-v1";
const BACKUP_KEY = "studyflow-db-v1-backup";

interface Store {
  db: DB;
  ready: boolean;
  saveError: string | null;
  storagePersisted: boolean;
  setDB: (fn: (d: DB) => DB) => void;
  addPlan: (p: Omit<StudyPlan, "id" | "createdAt" | "updatedAt" | "status"> & Partial<Pick<StudyPlan, "status">>) => StudyPlan;
  updatePlan: (id: string, patch: Partial<StudyPlan>) => void;
  deletePlan: (id: string) => void;
  addTask: (t: Omit<Task, "id" | "createdAt" | "updatedAt" | "completedAt">) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  completeTask: (id: string) => void;
  deleteTask: (id: string) => void;
  addSession: (s: Omit<StudySession, "id">) => StudySession;
  logAction: (tool: string, summary: string, ok: boolean) => void;
  importDB: (d: DB) => { ok: boolean; error?: string };
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDbState] = useState<DB>(defaultDB());
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [storagePersisted, setStoragePersisted] = useState(false);

  // One-time hydration from on-device storage (an external system). The
  // setState calls here are the synchronization itself, guarded by the
  // `ready` flag so server-rendered and first client renders match.
  // Data durability: every save writes a primary copy AND a backup copy.
  // If the primary copy is ever missing/corrupt, the backup is restored
  // automatically — the app never silently starts empty or wipes data.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const hydrate = (parsed: DB) => ({ ...defaultDB(), ...parsed, preferences: { ...defaultDB().preferences, ...(parsed.preferences ?? {}) }, memory: { ...defaultDB().memory, ...(parsed.memory ?? {}) } });
    let loaded = false;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { setDbState(hydrate(JSON.parse(raw) as DB)); loaded = true; }
    } catch { loaded = false; }
    if (!loaded) {
      try {
        const backup = localStorage.getItem(BACKUP_KEY);
        if (backup) {
          setDbState(hydrate(JSON.parse(backup) as DB));
          setSaveError("Your saved data was restored from its automatic on-device backup. Nothing was lost.");
          try { localStorage.setItem(KEY, backup); } catch { /* ignore */ }
          loaded = true;
        }
      } catch { /* no usable backup */ }
    }
    if (!loaded && localStorage.getItem(KEY)) {
      setSaveError("Saved data could not be read and no backup was available. Starting with a clean workspace.");
    }
    // Ask the browser/OS to treat this storage as persistent (exempt from
    // automatic eviction) — the standard durability API for installed apps.
    if (navigator.storage?.persist) {
      navigator.storage.persisted().then((already) => {
        if (already) { setStoragePersisted(true); return; }
        navigator.storage.persist().then(setStoragePersisted).catch(() => undefined);
      }).catch(() => undefined);
    }
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const persist = useCallback((next: DB) => {
    try {
      const serialized = JSON.stringify(next);
      localStorage.setItem(KEY, serialized);
      try { localStorage.setItem(BACKUP_KEY, serialized); } catch { /* backup is best-effort */ }
      setSaveError(null);
    } catch {
      setSaveError("Could not save to this device (storage full or blocked). Changes are kept for this session only.");
    }
  }, []);

  const setDB = useCallback((fn: (d: DB) => DB) => {
    setDbState((prev) => {
      const next = fn(prev);
      persist(next);
      return next;
    });
  }, [persist]);

  const addPlan: Store["addPlan"] = useCallback((p) => {
    const plan: StudyPlan = { ...p, id: uid(), status: p.status ?? "active", createdAt: nowISO(), updatedAt: nowISO() };
    setDB((d) => ({ ...d, plans: [plan, ...d.plans] }));
    return plan;
  }, [setDB]);

  const updatePlan: Store["updatePlan"] = useCallback((id, patch) => {
    setDB((d) => ({ ...d, plans: d.plans.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: nowISO() } : x)) }));
  }, [setDB]);

  const deletePlan: Store["deletePlan"] = useCallback((id) => {
    setDB((d) => ({ ...d, plans: d.plans.filter((x) => x.id !== id), tasks: d.tasks.map((t) => (t.planId === id ? { ...t, planId: null } : t)) }));
  }, [setDB]);

  const addTask: Store["addTask"] = useCallback((t) => {
    const task: Task = { ...t, id: uid(), createdAt: nowISO(), updatedAt: nowISO(), completedAt: null };
    setDB((d) => ({ ...d, tasks: [task, ...d.tasks] }));
    return task;
  }, [setDB]);

  const updateTask: Store["updateTask"] = useCallback((id, patch) => {
    setDB((d) => ({ ...d, tasks: d.tasks.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: nowISO(), completedAt: patch.status === "completed" ? x.completedAt ?? nowISO() : patch.status ? null : x.completedAt } : x)) }));
  }, [setDB]);

  const completeTask: Store["completeTask"] = useCallback((id) => updateTask(id, { status: "completed" }), [updateTask]);

  const deleteTask: Store["deleteTask"] = useCallback((id) => {
    setDB((d) => ({ ...d, tasks: d.tasks.filter((x) => x.id !== id) }));
  }, [setDB]);

  const addSession: Store["addSession"] = useCallback((s) => {
    const session: StudySession = { ...s, id: uid() };
    setDB((d) => ({ ...d, sessions: [session, ...d.sessions] }));
    return session;
  }, [setDB]);

  const logAction: Store["logAction"] = useCallback((tool, summary, ok) => {
    setDB((d) => ({ ...d, actions: [{ id: uid(), tool, summary, ok, createdAt: nowISO() }, ...d.actions].slice(0, 100) }));
  }, [setDB]);

  const importDB: Store["importDB"] = useCallback((incoming) => {
    if (!incoming || !Array.isArray(incoming.plans) || !Array.isArray(incoming.tasks) || !Array.isArray(incoming.sessions)) {
      return { ok: false, error: "File does not look like a StudyFlow export (plans/tasks/sessions arrays required)." };
    }
    const merged: DB = { ...defaultDB(), ...incoming, preferences: { ...defaultDB().preferences, ...(incoming.preferences ?? {}) }, memory: { ...defaultDB().memory, ...(incoming.memory ?? {}) }, chat: Array.isArray(incoming.chat) ? incoming.chat : [], actions: Array.isArray(incoming.actions) ? incoming.actions : [] };
    setDbState(merged);
    persist(merged);
    return { ok: true };
  }, [persist]);

  const value = useMemo<Store>(() => ({ db, ready, saveError, storagePersisted, setDB, addPlan, updatePlan, deletePlan, addTask, updateTask, completeTask, deleteTask, addSession, logAction, importDB }),
    [db, ready, saveError, storagePersisted, setDB, addPlan, updatePlan, deletePlan, addTask, updateTask, completeTask, deleteTask, addSession, logAction, importDB]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}

// ---- Derived metrics (always computed from real records) ----
export function planProgress(db: DB, planId: string): { done: number; total: number; pct: number } {
  const tasks = db.tasks.filter((t) => t.planId === planId);
  const done = tasks.filter((t) => t.status === "completed").length;
  return { done, total: tasks.length, pct: tasks.length ? Math.round((done / tasks.length) * 100) : 0 };
}

export function totalStudySeconds(db: DB): number {
  return db.sessions.filter((s) => s.completed).reduce((a, s) => a + s.durationSeconds, 0);
}

export function studyStreak(db: DB): number {
  const days = new Set(db.sessions.filter((s) => s.completed).map((s) => s.endedAt.slice(0, 10)));
  if (!days.size) return 0;
  let streak = 0;
  const d = new Date();
  // allow today or yesterday as streak anchor
  const key = (dt: Date) => dt.toISOString().slice(0, 10);
  if (!days.has(key(d))) { d.setDate(d.getDate() - 1); if (!days.has(key(d))) return 0; }
  while (days.has(key(d))) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}

export function fmtDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function todayKey(): string { return new Date().toISOString().slice(0, 10); }
