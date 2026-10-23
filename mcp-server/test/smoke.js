/**
 * Smoke test for the StudyFlow MCP server (Streamable HTTP).
 * Spawns the server, runs initialize -> tools/list -> tools/call for every
 * tool, and asserts the DB file was written. Exits non-zero on any failure.
 */
import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 3499;
const BASE = `http://localhost:${PORT}/mcp`;
const DB_FILE = resolve(ROOT, "data", "studyflow-db.json");

if (existsSync(DB_FILE)) rmSync(DB_FILE); // start from a clean store

const server = spawn("node", [resolve(ROOT, "dist", "http.js")], {
  env: { ...process.env, STUDYFLOW_MCP_PORT: String(PORT) },
  stdio: ["ignore", "pipe", "pipe"],
});
server.stderr.on("data", (d) => process.stderr.write(`[server] ${d}`));

let failures = 0;
const check = (name, cond, extra = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra}`);
  if (!cond) failures++;
};

async function rpc(method, params = {}) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const text = await res.text();
  // Stateless transport replies with plain JSON; tolerate SSE framing too.
  const payload = text.startsWith("event:")
    ? JSON.parse(text.split("\n").find((l) => l.startsWith("data:"))?.slice(5) ?? "{}")
    : JSON.parse(text);
  if (payload.error) throw new Error(`${method} -> ${JSON.stringify(payload.error)}`);
  return payload.result;
}

const textOf = (result) => JSON.parse(result.content[0].text);

async function main() {
  // wait for server
  for (let i = 0; i < 50; i++) {
    try { await fetch(`http://localhost:${PORT}/health`); break; } catch { await new Promise((r) => setTimeout(r, 200)); }
  }

  const init = await rpc("initialize", {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "smoke", version: "1.0" },
  });
  check("initialize (protocol 2025-11-25)", init.protocolVersion === "2025-11-25", ` -> ${init.protocolVersion}`);
  check("server name", init.serverInfo?.name === "studyflow-mcp", ` -> ${init.serverInfo?.name}`);

  const listed = await rpc("tools/list");
  const names = listed.tools.map((t) => t.name).sort();
  const expected = ["addTask", "completeTask", "createStudyPlan", "getStudyContext", "getStudyHistory", "listTasks", "suggestNextStep", "updateTask"].sort();
  check("tools/list exposes 8 StudyFlow tools", JSON.stringify(names) === JSON.stringify(expected), ` -> ${names.join(",")}`);

  const plan = textOf(await rpc("tools/call", {
    name: "createStudyPlan",
    arguments: { goal: "learn basic Spanish verbs", currentLevel: "beginner", minutesPerDay: 30 },
  }));
  check("createStudyPlan ok", plan.ok === true, ` -> ${plan.summary}`);
  check("createStudyPlan generated 6 tasks", plan.data?.tasks?.length === 6);
  const planId = plan.data.plan.id;

  const added = textOf(await rpc("tools/call", {
    name: "addTask",
    arguments: { title: "Review ser vs estar notes", priority: "high" },
  }));
  check("addTask ok", added.ok === true && added.data.task.planId === planId);

  const listed2 = textOf(await rpc("tools/call", { name: "listTasks", arguments: { status: "pending" } }));
  check("listTasks pending = 7", listed2.data.tasks.length === 7, ` -> ${listed2.data.tasks.length}`);

  const done = textOf(await rpc("tools/call", { name: "completeTask", arguments: { query: "ser vs estar" } }));
  check("completeTask by query", done.ok === true && done.data.planProgress === 14, ` -> ${done.summary}`);

  const ctx = textOf(await rpc("tools/call", { name: "getStudyContext", arguments: {} }));
  check("getStudyContext mentions plan", ctx.ok && ctx.summary.includes("Learn basic Spanish verbs"));

  const next = textOf(await rpc("tools/call", { name: "suggestNextStep", arguments: {} }));
  check("suggestNextStep recommends", next.ok && next.summary.length > 10, ` -> ${next.summary.slice(0, 60)}…`);

  const hist = textOf(await rpc("tools/call", { name: "getStudyHistory", arguments: { limit: 5 } }));
  check("getStudyHistory ok", hist.ok === true && hist.data.sessionCount === 0);

  // Schema-level validation: the SDK rejects title "x" (min 3) before the
  // handler runs, returning a result with isError=true.
  let rejected = false;
  try {
    const r = await rpc("tools/call", { name: "addTask", arguments: { title: "x" } });
    rejected = r.isError === true;
  } catch {
    rejected = true;
  }
  check("validation rejects short title", rejected);

  check("DB file persisted", existsSync(DB_FILE));

  server.kill();
  console.log(failures === 0 ? "\nALL SMOKE TESTS PASSED" : `\n${failures} FAILURES`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("SMOKE TEST ERROR:", err.message);
  server.kill();
  process.exit(1);
});
