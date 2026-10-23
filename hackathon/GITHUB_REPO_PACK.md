# GitHub repo pack — StudyFlow hackathon submission

> Devpost requires: all source code, assets, and instructions to run the project.
> For Alexa+ the repo must **actually use the track technology in code**
> (an import, an entry point, an MCP config — not just a README mention). Ours does:
> `mcp-server/` imports `@modelcontextprotocol/sdk`, registers 8 tools, and ships
> runnable entry points (`dist/http.js`, `dist/stdio.js`).

## Recommendation: public repo + MIT license
- Simplest path (no collaborator invites, no 7-day expiry risk).
- Also enters you in the **Open Source mini challenge** ($5,000) — a new MIT-licensed
  project created during the window qualifies.
- The repo contains no secrets (StudyFlow uses no API keys; everything is local).

## What goes in the repo
Everything under `~/workspace/studyflow/`:
- the Next.js web app (root) — live at the Vercel URL
- `mcp-server/` — the self-hosted MCP server (built, 15/15 smoke tests pass)
- `hackathon/` — this submission pack (description, video script, repo steps)
- `README.md` (root — the web app's README already exists)
- `LICENSE` (MIT) at the repo root ← **copy from `mcp-server/LICENSE`**

`.gitignore` must exclude: `node_modules/`, `.next/`, `mcp-server/dist/`,
`mcp-server/data/`, `mcp-server/node_modules/`, `.env*`.

## Exact commands (run on your machine that has git + your GitHub login)

```bash
cd ~/workspace/studyflow
cp mcp-server/LICENSE ./LICENSE
cat > .gitignore <<'EOF'
node_modules/
.next/
dist/
mcp-server/dist/
mcp-server/data/
mcp-server/node_modules/
.env*
*.log
EOF
git init -b main
git add -A
git commit -m "StudyFlow: agentic study planner + self-hosted MCP server (Alexa+ track)"
# create the repo on github.com (public, no README/license — you already have them), then:
git remote add origin https://github.com/<YOUR-USERNAME>/studyflow.git
git push -u origin main
```

## If you'd rather keep it private
Devpost allows private repos **only** if shared with the Amazon team: Settings →
Collaborators → Add people → `knmeiss`, `giolaq`, `anishamalde`, `mosesroth`,
`emersonsklar`. Note: each invite must be accepted and expires after 7 days — add them
at submit time, not earlier. (Public is still the recommended path.)

## After pushing — Devpost checklist
1. Paste the repo URL, demo video URL (< 3 min, public, English), and the text from
   `hackathon/DEVPOST_SUBMISSION.md` into https://amazonappdev2026.devpost.com/
2. Select track **Alexa+** and mini challenge **Open Source**
3. Submit before **Oct 23, 12:00 pm PDT** (Oct 24, 00:30 IST)
