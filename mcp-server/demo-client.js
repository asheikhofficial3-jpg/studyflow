/**
 * One-command demo client for the StudyFlow MCP server.
 * Usage:  node demo-client.js [goal]
 * Starts nothing itself — point it at a running server (npm start).
 * Shows: initialize -> tools/list -> createStudyPlan -> addTask ->
 *          completeTask -> suggestNextStep, printing human-readable output.
 */
const BASE = process.env.STUDYFLOW_MCP_URL ?? "http://localhost:3001/mcp";
const GOAL = process.argv[2] ?? "learn conversational French";

async function rpc(method, params = {}) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
  });
  const text = await res.text();
  const payload = text.startsWith("event:")
    ? JSON.parse(text.split("\n").find((l) => l.startsWith("data:"))?.slice(5) ?? "{}")
    : JSON.parse(text);
  if (payload.error) throw new Error(`${method}: ${JSON.stringify(payload.error)}`);
  return payload.result;
}

const textOf = (r) => JSON.parse(r.content[0].text);

async function main() {
  console.log("== StudyFlow MCP demo ==\n");

  const init = await rpc("initialize", {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "studyflow-demo", version: "1.0" },
  });
  console.log(`Connected: ${init.serverInfo.name} v${init.serverInfo.version} (protocol ${init.protocolVersion})\n`);

  const { tools } = await rpc("tools/list");
  console.log(`Tools (${tools.length}): ${tools.map((t) => t.name).join(", ")}\n`);

  console.log(`-- createStudyPlan: "${GOAL}"`);
  const plan = textOf(await rpc("tools/call", {
    name: "createStudyPlan",
    arguments: { goal: GOAL, currentLevel: "beginner", minutesPerDay: 30 },
  }));
  console.log(plan.summary);
  plan.data.tasks.forEach((t, i) => console.log(`   ${i + 1}. ${t.title} (~${t.estimatedMinutes} min)`));

  console.log("\n-- addTask");
  const added = textOf(await rpc("tools/call", {
    name: "addTask",
    arguments: { title: "Practice greetings out loud for 10 minutes", priority: "high" },
  }));
  console.log(added.summary);

  console.log("\n-- completeTask (by title query)");
  const done = textOf(await rpc("tools/call", {
    name: "completeTask",
    arguments: { query: "greetings" },
  }));
  console.log(done.summary);

  console.log("\n-- suggestNextStep");
  const next = textOf(await rpc("tools/call", { name: "suggestNextStep", arguments: {} }));
  console.log(next.summary);

  console.log("\n== Demo complete: plan created, task added, task completed, next step suggested ==");
}

main().catch((e) => { console.error("demo failed:", e.message); process.exit(1); });
