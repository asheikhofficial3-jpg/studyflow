# Demo video script — StudyFlow × Alexa+ MCP server (under 3:00, English, public)

> Record on your phone or with screen recording. No copyrighted music, no trademarks
> that aren't yours. Upload to YouTube/Vimeo as **public**, then paste the link into Devpost.
> Target total: **~2:20**. Lead with the MCP server — judges score Tech Implementation first.

## Shot list & script

**[0:00–0:15] Hook — the problem (webcam or voiceover over the live app)**
> "Students drown in study apps that only track what you type in. StudyFlow is an agentic
> study planner — it turns a goal into a sequenced plan, manages tasks, times focus sessions,
> and tells you what to do next from your real progress. And now, any AI agent can drive it —
> through a self-hosted MCP server built for Alexa+."
*Show: the live app at https://studyflow-asheikhofficial3-jpgs-projects.vercel.app — Overview page.*

**[0:15–0:45] The web app is real (screen record, quick tour)**
*Click through: Agent chat ("Create a plan to learn…") → plan appears with 6 tasks →
My Tasks → Focus Session timer → Progress chart.*
> "Eight working routes, a real agent tool layer — createStudyPlan, addTask, completeTask and
> more — all verified against real state, with tests passing. No fake AI, no mock data."

**[0:45–1:50] The MCP server in action (terminal screen record — the core of the entry)**
*Terminal 1: `cd studyflow/mcp-server && npm start` → "listening on http://localhost:3001/mcp".*
*Terminal 2: `node demo-client.js "prepare for my physics midterm"` — let it run, narrate:*
> "This is the self-hosted MCP server — spec 2025-11-25, Streamable HTTP. It exposes the same
> eight agent tools. Watch: it connects, lists the tools, creates a full study plan from one
> goal, adds a task, completes it — plan progress updates to fourteen percent — and recommends
> the next step. Every call is a real state change in the server's persistent store."
*Point at the JSON output as each step lands. This is the money shot — don't rush it.*

**[1:50–2:10] Why this fits Alexa+ (voiceover over code)**
*Show `mcp-server/src/server.ts` briefly — the tool registrations — then the README's
Claude Desktop config snippet.*
> "Because it's a standard MCP server, any MCP host can use it — over stdio or HTTP. The
> natural next step is an Alexa+ skill: 'Alexa, ask StudyFlow what's next' — answered from
> the student's real data."

**[2:10–2:25] Close (webcam or app)**
> "StudyFlow: an agentic study planner you can see — and now, an MCP server any agent can
> drive. Links to the code, the live app, and the server are in the description."

## Recording checklist
- [ ] Terminal font large enough to read at 1080p
- [ ] Run `npm run build` in mcp-server once before recording (dist/ must exist)
- [ ] Delete `mcp-server/data/studyflow-db.json` before the take so the demo starts clean
- [ ] Keep it under 3:00 — judges aren't required to watch past that
- [ ] Upload as public; paste link into Devpost + into DEVPOST_SUBMISSION.md
