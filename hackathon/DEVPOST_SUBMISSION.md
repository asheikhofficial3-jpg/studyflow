# Devpost Submission — StudyFlow (draft, ready to paste)

> Track: **Alexa+** · Mini challenge: **Open Source**
> Deadline: Oct 23, 12:00 pm PDT (Oct 24, 00:30 IST)
> Paste into https://amazonappdev2026.devpost.com/ — every field below maps to a required submission field.

## Project title
StudyFlow — Agentic AI Study Planner with a self-hosted MCP server

## Tagline (short description)
An agentic AI study planner that turns learning goals into sequenced plans, manages tasks, tracks focus sessions — now controllable through a self-hosted MCP server (spec 2025-11-25, Streamable HTTP) built for Alexa+.

## Text description (paste as the project description)
StudyFlow is a working agentic AI study planner: tell it a learning goal and it generates a
sequenced study plan with actionable tasks, manages your task list, runs distraction-minimizing
focus sessions, records real session history, and recommends your next step from actual progress —
never fabricated data.

For the Alexa+ track I built **studyflow-mcp**, a self-hosted MCP server (MCP spec 2025-11-25,
Streamable HTTP transport, plus a stdio transport) that exposes StudyFlow's real agent tool layer
as 8 tools: `createStudyPlan`, `addTask`, `listTasks`, `updateTask`, `completeTask`,
`getStudyHistory`, `getStudyContext`, `suggestNextStep`. Every tool executes against a persistent
server-side store (same data model as the web app), validates inputs at the protocol level, and
writes to an agent action audit log. Any MCP host — including Alexa+ Agent Skill hosts — can
launch it over stdio or call it over HTTP and drive a full study-planning session, as the demo
video shows.

The web app (Next.js 16, deployed live) remains the visual home of StudyFlow: 8 fully functional
routes, a signature CSS-3D AI orb with genuine app-state-driven states, and a clearly labelled
local rule-based agent fallback (no fake AI). It is an installable PWA (manifest + service
worker, offline-capable) for phone, PC and Fire TV's Silk browser, and its data layer is built
to never lose work: dual on-device copies with automatic backup-restore, persistent-storage
protection (navigator.storage.persist), portable validated JSON export/restore — and deliberately
no wipe button. The MCP server makes that same agent capability
available to voice-first and agent-first surfaces — the natural next step is an Alexa+ skill that
lets a student say "Alexa, ask StudyFlow what's next" and get a real answer from their real data.

## How it uses the track technology (Alexa+)
- Repo contains `mcp-server/` with a real entry point (`dist/http.js`, `dist/stdio.js`), a real
  dependency on `@modelcontextprotocol/sdk`, and MCP tool registrations — not a README mention.
- Implements MCP spec 2025-11-25 over Streamable HTTP (POST /mcp), verified with protocol-level
  initialize → tools/list → tools/call calls in the demo video.
- Tools are the same validated agent tools the web app's agent uses; results are real
  state changes, persisted and auditable.

## What was built during the submission window
The entire project was built during the hackathon window (Aug 31 – Oct 23, 2026): the StudyFlow
web app on Oct 22 and the self-hosted MCP server on Oct 23. Nothing predates the window.

## Links (fill in before submitting)
- Demo video (YouTube/Vimeo, public, < 3 min): <PASTE LINK>
- GitHub repo (public, MIT): https://github.com/asheikhofficial3-jpg/studyflow
- Live web app: https://studyflow-asheikhofficial3-jpgs-projects.vercel.app
- Track: Alexa+ · Mini challenge: Open Source

## Open Source mini challenge — required fields (paste into the mini-challenge section)
Devpost requires these four fields for the Open Source mini challenge; for a new project
the contribution URL is the repo URL itself.
- Contribution URL: https://github.com/asheikhofficial3-jpg/studyflow
- Repo URL: https://github.com/asheikhofficial3-jpg/studyflow
- GitHub username: asheikhofficial3-jpg
- Short description: StudyFlow is a new MIT-licensed open-source project created during the
  hackathon window (Oct 22–23, 2026): an agentic AI study planner (Next.js web app) plus
  studyflow-mcp, a self-hosted MCP server (spec 2025-11-25, Streamable HTTP) exposing the
  planner's 8 agent tools to any MCP host. How it works: the server registers the same
  validated agent tools the web app uses — createStudyPlan, addTask, listTasks, updateTask,
  completeTask, getStudyHistory, getStudyContext, suggestNextStep — over a persistent JSON
  store with an agent action audit log; clients connect over stdio or Streamable HTTP.
  Why it matters: it turns a working study app into an agent-accessible backend, the exact
  pattern Alexa+ integrations are built on, and it's fully open source so anyone can run,
  extend, or connect it to their own agent host.

## Product feedback (required field — paste as-is, edit freely)

**MCP TypeScript SDK (v1.32.1)** — used for the self-hosted server (StreamableHTTPServerTransport
+ McpServer tool registration). What worked: the high-level `McpServer.registerTool` API with
zod schemas made tool definition genuinely pleasant, and stateless Streamable HTTP mode removed
all session bookkeeping for a self-hosted demo. Friction: none blocking; I would build with it
again for any MCP server work.

**Next.js 16 + React 19 + Tailwind v4** — the web app. What worked: App Router conventions and
the production build were solid; `next build` caught real type errors early. Friction: minor —
some Next 16 APIs differ from older docs, so I read the bundled agent-rules docs in
`node_modules/next/dist/docs/` before writing framework code. Onboarding felt fine once I did
that. Would build with it again.

**Vercel** — deployment target for the web app. What worked: connecting the repo and deploying
was fast, and disabling SSO protection for a public demo link was one toggle. Friction: the
first build failed on a `@types/node`/Vitest peer conflict that had to be fixed at the dependency
root — not Vercel-specific, but it cost a redeploy cycle. Would deploy here again.

**Vitest** — unit/integration tests for the agent tools and study metrics (9/9 passing). Worked
exactly as documented; would use again.

**No AWS services were used in this project**, so there is no AWS feedback to give. The Open
Source mini challenge applies: this is a new MIT-licensed open-source project created during the
window (repo linked above).

## Friction log (optional, up to +10% judging bonus — paste if you want it)
1. Task: run a public tunnel for a shareable demo link from the dev VM. Steps: tried Cloudflare
   tunnel, localtunnel, SSH tunnel. Expected: a public URL. Actual: all three blocked by the
   network (TLS handshake failure / hangs / proxy resets). Severity: medium. Workaround: deployed
   to Vercel instead — better outcome (permanent link). Suggestion: none for Amazon; environment-
   specific.
2. Task: compile the MCP server with the installed TypeScript 7 toolchain. Steps: `tsc` refused
   `node:`-prefixed imports ("looks like an absolute URI") and did not auto-include `@types/node`.
   Expected: standard Node types resolution. Actual: had to use bare specifiers and explicit
   `"types": ["node"]` in tsconfig. Severity: low. Workaround applied in-repo. Suggestion: n/a
   (toolchain-side, not Amazon).
