"use client";
import { useRef, useState } from "react";
import { Download, HardDriveDownload, ShieldCheck, Upload } from "lucide-react";
import { Field, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store";
import { DB } from "@/lib/types";

export default function SettingsPage() {
  const { db, ready, setDB, importDB, logAction, storagePersisted } = useStore();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const p = db.preferences;

  if (!ready) return <p aria-live="polite">Loading settings…</p>;
  const update = (patch: Partial<typeof p>) => { setDB((d) => ({ ...d, preferences: { ...d.preferences, ...patch } })); setNotice("Preference saved."); };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `studyflow-export-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
    logAction("exportData", "Exported all StudyFlow data as JSON", true);
    setNotice("Export downloaded. It contains your preferences, plans, tasks, sessions, agent action log, study memory, and chat history.");
  };

  const onImport = async (f: File | undefined) => {
    if (!f) return;
    setError(""); setNotice("");
    try {
      const parsed = JSON.parse(await f.text()) as DB;
      const res = importDB(parsed);
      if (!res.ok) setError(res.error ?? "Import failed validation.");
      else { logAction("importData", "Imported StudyFlow data from JSON", true); setNotice("Import complete — your data was validated and restored."); }
    } catch { setError("That file is not valid JSON. Export a file from StudyFlow and try again."); }
  };

  return (
    <div>
      <PageHeader title="Settings & Data" sub="Your data lives on this device and is built to stay: dual on-device copies, an automatic backup, and persistent-storage protection. StudyFlow never auto-deletes your data." />
      {notice && <p role="status" className="card mb-4 p-4 text-sm" style={{ color: "#7df0cd" }}>{notice}</p>}
      {error && <p role="alert" className="card mb-4 p-4 text-sm" style={{ color: "#ffb4c0" }}>{error}</p>}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5" aria-labelledby="prefs-h">
          <h2 id="prefs-h" className="mb-4 font-bold">Study preferences</h2>
          <div className="flex flex-col gap-4">
            <Field label="Your name (used in greetings)"><input className="input" value={p.displayName} onChange={(e) => update({ displayName: e.target.value })} placeholder="e.g. Alex" /></Field>
            <Field label="Default focus duration (minutes)"><input className="input" type="number" min={1} max={180} value={p.defaultFocusMinutes} onChange={(e) => update({ defaultFocusMinutes: Math.min(180, Math.max(1, Number(e.target.value) || 25)) })} /></Field>
            <Field label="Daily study goal (minutes)"><input className="input" type="number" min={5} max={1440} value={p.dailyGoalMinutes} onChange={(e) => update({ dailyGoalMinutes: Math.min(1440, Math.max(5, Number(e.target.value) || 60)) })} /></Field>
            <label className="flex items-center justify-between gap-3 text-sm font-semibold">Reduce motion (orb & animations)
              <input type="checkbox" className="h-5 w-5 accent-[#1fd6a2]" checked={p.reducedMotion} onChange={(e) => update({ reducedMotion: e.target.checked })} /></label>
            <label className="flex items-center justify-between gap-3 text-sm font-semibold">Session reminders (in-app only)
              <input type="checkbox" className="h-5 w-5 accent-[#1fd6a2]" checked={p.notifications} onChange={(e) => update({ notifications: e.target.checked })} /></label>
            <p className="text-xs" style={{ color: "#9fb0d8" }}>Note: reminders are in-app only in this local MVP — no push notifications or emails are sent, and StudyFlow does not claim otherwise.</p>
          </div>
        </section>

        <section className="card p-5" aria-labelledby="memory-h">
          <h2 id="memory-h" className="mb-4 font-bold">Study memory</h2>
          <p className="text-sm" style={{ color: "#9fb0d8" }}>What the agent remembers to improve recommendations. Only facts you provided or real activity — never guesses.</p>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            <li><strong>Active plans:</strong> {db.plans.filter((x) => x.status === "active").map((x) => x.title).join(", ") || "none"}</li>
            <li><strong>Reported difficulties:</strong> {db.memory.difficulties.length ? db.memory.difficulties.join(" · ") : "none reported"}</li>
            <li><strong>Last recommendation:</strong> {db.memory.lastRecommendation || "none yet"}</li>
          </ul>
        </section>
      </div>

      <section className="card mt-5 p-5" aria-labelledby="safe-h">
        <h2 id="safe-h" className="mb-2 flex items-center gap-2 font-bold"><ShieldCheck size={18} style={{ color: "#3ee6b6" }} /> Your data is safe — and stays yours</h2>
        <ul className="flex flex-col gap-1.5 text-sm" style={{ color: "#9fb0d8" }}>
          <li>• <strong style={{ color: "#eaf0ff" }}>Closing the app or browser never deletes anything.</strong> Plans, tasks, sessions and history are stored on this device and survive restarts.</li>
          <li>• Every change is saved <strong style={{ color: "#eaf0ff" }}>twice</strong> — a primary copy and an automatic backup copy. If one is ever damaged, the other is restored automatically at launch.</li>
          <li>• Persistent storage on this device: <strong style={{ color: storagePersisted ? "#7df0cd" : "#ffd98a" }}>{storagePersisted ? "Protected ✓ (exempt from automatic cleanup)" : "Requested — installing the app (below) makes it permanent"}</strong>.</li>
          <li>• There is deliberately <strong style={{ color: "#eaf0ff" }}>no wipe/reset button</strong>: your study history is an asset, not clutter. The only way data leaves is when you export or restore it yourself.</li>
          <li>• On your own computer/server, the MCP server stores the same data in a durable JSON file on disk (<code>mcp-server/data/</code>).</li>
        </ul>
      </section>

      <section className="card mt-5 p-5" aria-labelledby="install-h">
        <h2 id="install-h" className="mb-2 flex items-center gap-2 font-bold"><HardDriveDownload size={18} style={{ color: "#3ee6b6" }} /> Install StudyFlow as an app — on any device</h2>
        <ul className="flex flex-col gap-1.5 text-sm" style={{ color: "#9fb0d8" }}>
          <li>• <strong style={{ color: "#eaf0ff" }}>Phone (Android/iPhone):</strong> open the live site → browser menu → “Add to Home screen” / “Install app”. It then opens full-screen like a native app and works offline.</li>
          <li>• <strong style={{ color: "#eaf0ff" }}>PC / laptop (Windows, Mac, Linux):</strong> in Chrome or Edge, click the install icon in the address bar → StudyFlow becomes a desktop app with its own window and icon.</li>
          <li>• <strong style={{ color: "#eaf0ff" }}>Amazon Fire TV:</strong> open the live site in the Silk browser and bookmark it — the interface is remote-friendly with large, clear targets.</li>
          <li>• <strong style={{ color: "#eaf0ff" }}>Alexa / Alexa+:</strong> run the self-hosted MCP server from the repo (<code>mcp-server/</code>) and connect your agent host — the same plans and tasks, controlled by voice.</li>
          <li>• <strong style={{ color: "#eaf0ff" }}>From the repo:</strong> clone it on any machine and <code>npm install && npm run build && npm start</code> — or self-host the MCP server for file-based storage on that machine.</li>
        </ul>
      </section>

      <section className="card mt-5 p-5" aria-labelledby="data-h">
        <h2 id="data-h" className="mb-2 font-bold">Backup & restore (portable copy)</h2>
        <p className="mb-4 text-sm" style={{ color: "#9fb0d8" }}>Export downloads everything — preferences, plans, tasks, sessions, agent actions, study memory, and chat — as one JSON file that belongs to you. Keep it anywhere (Drive, email, USB) and restore it on any device with Import: the file is validated before anything is restored, so a bad file can never damage your data.</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={exportJSON}><Download size={16} /> Export my data (JSON)</button>
          <button className="btn-ghost" onClick={() => fileRef.current?.click()}><Upload size={16} /> Restore from export</button>
          <input ref={fileRef} type="file" accept="application/json" className="sr-only" aria-label="Import StudyFlow JSON file" onChange={(e) => onImport(e.target.files?.[0])} />
        </div>
        <p className="mt-4 text-xs" style={{ color: "#9fb0d8" }}>Current data on this device: {db.plans.length} plans · {db.tasks.length} tasks · {db.sessions.length} sessions · {db.chat.length} chat messages — stored durably on-device (primary + automatic backup copy). No account or cloud is involved; your exports are the way to move data between devices.</p>
      </section>
    </div>
  );
}
