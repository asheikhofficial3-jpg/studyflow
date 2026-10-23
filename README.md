# StudyFlow — Agentic AI Study Planner

StudyFlow turns learning goals into actionable plans, manages tasks, tracks focus sessions and progress, remembers relevant study history, and adapts recommendations. Every metric is derived from real records — StudyFlow never invents activity, progress, or results.

## Features (implemented & verified)

- **Overview dashboard** — greeting/date, AI orb, next recommended action, today's tasks with one-tap completion, active plan progress, recorded study time, completed tasks, reliably calculated streak, recent activity, new-user onboarding state.
- **AI Study Agent** — chat with history, contextual suggestions, retries/error states, and a real tool layer (`createStudyPlan`, `addTask`, `listTasks`, `updateTask`, `completeTask`, `getStudyHistory`, `getStudyContext`, `suggestNextStep`). Actions execute against the real store and are only reported after execution. Runs a **clearly labelled local rule-based fallback** — no AI key needed.
- **Study Plans** — validated create/edit, active/completed/archived filters, progress from task completion, delete with confirmation (tasks become unassigned). New plans generate 6 sequenced tasks sized to level and minutes/day, with assumptions stated in the UI.
- **My Tasks** — full CRUD, pending/in-progress/completed states, priority, due date, estimated duration, plan association, status + plan filters, delete confirmation.
- **Focus Session** — configurable timer (1–180 min), start/pause/resume/finish, optional task context, reload-safe restore from the real end time, completion summary. Only sessions ≥ 5 seconds are recorded; uncompleted time is never counted.
- **Study History** — real sessions (date, start/end, duration, task, plan), plan filter, and an agent-action audit log.
- **Progress** — totals, last-7-days accessible bar chart (with text alternatives), 4-week trend, streak, per-plan progress, next-step recommendation. Honest empty state when there isn't enough data.
- **Settings & Data** — display name, default focus duration, daily goal, reduced-motion toggle, in-app reminders toggle (honestly scoped), study-memory inspection, **JSON export** and **validated JSON import/restore** (deliberately no wipe/reset — see Data & persistence).
- **Signature 3D-style orb** — pure CSS 3D (mint core, violet reflections, orbital rings, particles-free glow) with genuine states: idle / listening / planning / executing / success / error. Respects `prefers-reduced-motion` and the in-app reduce-motion setting; no WebGL cost.

## Design system

Midnight navy surfaces, mint/emerald accents, restrained violet highlights, Manrope typography, reusable tokens/components (cards, buttons, inputs, badges, progress bars) defined in `src/app/globals.css` and `src/components/ui.tsx`. Icons: Lucide. Fully responsive with a desktop sidebar and mobile navigation; semantic HTML, labelled forms, visible focus rings, keyboard-friendly controls.

## Alexa+ / MCP server (Amazon Developer Hackathon — Build, Ship, Shape)

For the hackathon's **Alexa+ track**, this repo includes **`mcp-server/`** — *studyflow-mcp*, a self-hosted MCP server (MCP spec **2025-11-25**, Streamable HTTP transport + stdio) that exposes StudyFlow's real agent tool layer as 8 tools: `createStudyPlan`, `addTask`, `listTasks`, `updateTask`, `completeTask`, `getStudyHistory`, `getStudyContext`, `suggestNextStep`. Tools validate inputs (zod + protocol-level schemas), execute against a persistent server-side store with the same data model as the web app, and write to an agent action audit log.

```bash
cd mcp-server
npm install && npm run build
npm start            # Streamable HTTP on :3001 (POST /mcp)
npm run start:stdio  # stdio transport for local MCP hosts
npm test             # protocol-level smoke tests (initialize → tools/list → tools/call)
node demo-client.js  # scripted end-to-end demo session
```

Any MCP host — including Alexa+ Agent Skill hosts — can drive a full study-planning session through it. Also entered in the **Open Source mini challenge** (new MIT-licensed project, created during the hackathon window). Submission materials live in `hackathon/`.

## Tech stack & architecture

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Vitest

```
src/
  app/            routes: / (overview), /agent, /plans, /tasks, /focus, /history, /progress, /settings
  components/     Shell (navigation), Orb, ui primitives
  lib/
    types.ts      UserPreferences, StudyPlan, Task, StudySession, AgentAction, StudyMemory, ChatMessage
    store.tsx     data-access layer + React context; localStorage persistence (key: studyflow-db-v1)
    agent.ts      tool implementations, plan generator, next-step engine, local fallback agent
    agent.test.ts unit tests for tools & derived metrics
```

## Getting started

Prerequisites: Node.js 20+ and npm.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run start      # serve production build
npm run lint       # ESLint
npx tsc --noEmit   # type-check
npm test           # Vitest unit tests
```

## Data & persistence — built to never lose your work

Local-first and durable by design (`src/lib/store.tsx`):

- **Closing the app or browser never deletes data.** Everything is stored on-device and survives restarts.
- **Dual copies:** every save writes a primary copy (`studyflow-db-v1`) *and* an automatic backup copy. If the primary is ever damaged, the backup is restored automatically at launch — the app never silently starts empty.
- **Persistent-storage protection:** the app requests `navigator.storage.persist()`, exempting its storage from automatic browser eviction; installing the PWA makes this permanent in practice.
- **No wipe/reset button exists** — deliberately. Data leaves only when the user exports it.
- **Portable backups:** Settings → Export JSON downloads everything as one validated file; Import restores it on any device (validated first, so a bad file can't damage existing data).
- The focus timer persists separately (`studyflow-timer-v1`) so a running session survives reloads. On your own machine, the MCP server stores the same data model in a durable JSON file on disk (`mcp-server/data/`). There is no account/cloud sync — exports are the cross-device mechanism.

## Install it as an app (any device)

StudyFlow is a **PWA** (web app manifest + service worker, offline-capable):

- **Phone:** open the live site → “Add to Home screen” / “Install app” → full-screen app with icon, works offline.
- **PC/laptop:** Chrome/Edge install icon in the address bar → desktop app window.
- **Amazon Fire TV:** open the live site in the Silk browser and bookmark it — large, remote-friendly targets.
- **Alexa / Alexa+:** connect an agent host to the self-hosted MCP server in `mcp-server/` and control plans/tasks by voice.
- **Self-host from the repo:** `npm install && npm run build && npm start` on any machine.

## AI configuration & fallback

No environment variables are required. The agent ships with a transparent local rule-based fallback that genuinely executes tools. To wire a live model later, add a **server-side** route handler that calls your provider with a secret stored only in an env var (e.g. `AI_PROVIDER_API_KEY` in `.env.local`, never committed, never exposed to the browser), validate its output into the same tool calls in `src/lib/agent.ts`, and keep the fallback for outages.

## Testing

`npm test` — 9 unit tests covering plan-task generation (incl. level branches and duration floor), plan progress, study-time totals (uncompleted sessions excluded), streak calculation, duration formatting, next-step prioritisation, and agent list/context tools. Production build, ESLint, and TypeScript checks are part of delivery verification (see the delivery report in the project conversation).

Manual checks worth doing: create a plan → complete a task → dashboard/progress update; run a 1-minute focus session → appears in History/Progress; reload mid-session → timer restored; export → reset → import round-trip; mobile viewport navigation; keyboard-only navigation.

## Known limitations

- Local storage only: data is per-browser and cleared if site data is wiped (export regularly).
- Browser timers can drift if the tab is fully closed; the UI states this and never claims to verify attention.
- Agent fallback understands a documented set of intents (listed in the Agent page and `src/lib/agent.ts`); it is not a general LLM.
- Notifications preference is in-app only — no push/email exists in this MVP.
- Resolved: the scaffold's `@types/node@20` conflicted with Vitest 5's optional peer range (`^22 || >=24`) and broke a plain `npm install` on Vercel; `@types/node` is now pinned to `^22` and installs/builds are clean everywhere.

## Future improvements

Optional Supabase backend (tables + RLS + auth) behind the same data-access layer; live LLM provider with structured tool-calling; spaced-repetition scheduling; calendar export; PWA/offline install; E2E tests (Playwright) for the full plan→task→session flow.
