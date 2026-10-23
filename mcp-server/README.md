# studyflow-mcp

A self-hosted MCP server exposing StudyFlow's agentic study-planner tools.
Built for the **Alexa+ track** of the *Build, Ship, Shape: Amazon Developer Hackathon* —
the track accepts "a self-hosted MCP server (spec 2025-11-25 or later, Streamable HTTP)".

## Tools

| Tool | What it does |
|---|---|
| `createStudyPlan` | Create a study plan from a goal; auto-generates 6 sequenced tasks sized to level + minutes/day |
| `addTask` | Add a task (attaches to the active plan when `planId` is omitted) |
| `listTasks` | List tasks, optionally filtered by status |
| `updateTask` | Update a task by id (title, status, priority, due date, estimate, plan) |
| `completeTask` | Complete a task by id or title query; updates plan progress |
| `getStudyHistory` | Completed focus sessions + total recorded study time |
| `getStudyContext` | Compact summary: active plans, task counts, study time, difficulties |
| `suggestNextStep` | Recommend the single best next study action |

All tools execute against a real persistent store (`data/studyflow-db.json`, same shape as
the StudyFlow web app's `studyflow-db-v1`), validate inputs (protocol-level via zod schemas),
and append to an agent action audit log.

## Run

```bash
npm install
npm run build

# Streamable HTTP (default port 3001)
npm start
# -> POST http://localhost:3001/mcp

# stdio (for Claude Desktop / VS Code / other MCP hosts)
npm run start:stdio
```

Environment overrides: `STUDYFLOW_MCP_PORT`, `STUDYFLOW_MCP_DB` (path to the JSON store).

## Connect an MCP client

Claude Desktop (`claude_desktop_config.json`), stdio:

```json
{
  "mcpServers": {
    "studyflow": {
      "command": "node",
      "args": ["/absolute/path/to/studyflow/mcp-server/dist/stdio.js"]
    }
  }
}
```

Streamable HTTP clients: point at `http://localhost:3001/mcp` (stateless — no session negotiation needed).

## Test

```bash
npm test   # protocol smoke test: initialize -> tools/list -> all 8 tools -> validation -> persistence
```

## Honest notes

- The server keeps its own JSON store; it does not share the web app's browser localStorage.
  Both use the same data model, so exports/imports move cleanly between them.
- The plan/task generator is the same deterministic local generator as the web app —
  labelled as local, never as live AI.
