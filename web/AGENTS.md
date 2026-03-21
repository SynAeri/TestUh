# Agent Instructions — Nexus (FoundersHack Sydney 2026)

## Next.js Version Warning
This is **not** the Next.js you know. This version has breaking changes — APIs, conventions, and file structure may differ from training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

---

## Product

**Nexus** — AI-Powered Incident Response Platform

**One-liner:** Captures decision-making context from AI coding sessions (Claude, Codex, Cursor, etc.) and links it to PRs, tickets, and deployments — so when production breaks, the system explains why, drafts a fix, and assigns it to the right engineer.

**Core insight:** When engineers use AI coding tools, the richest context about *why* code was written lives in the AI conversation — not in PR descriptions, commit messages, or build logs. That context is currently thrown away. Nexus captures and surfaces it during incidents.

**Workflow:**
1. A Claude Code skill summarizes key decisions during AI coding sessions
2. MCP connection saves context to a central database
3. Platform links decisions to PRs (GitHub), tickets (Linear/Jira), and deployments (Vercel)
4. When an incident fires, Nexus traces root cause, drafts a fix, and suggests the right engineer to review

---

## Tech Stack

- **Frontend:** Next.js (App Router), React, Tailwind CSS v4, TypeScript
- **Backend:** FastAPI, Supabase (PostgreSQL + vector search), Gemini API
- **Design:** Light mode only — `bg-slate-50` page, `bg-white` cards, `border-slate-200` borders

---

## UI Rules

- **Light mode only** — never use dark mode classes (`bg-[#030712]`, `text-white` as primary, `border-white/8`, `bg-white/3`, etc.)
- Use `text-slate-900` for primary text, `text-slate-500` for secondary, `text-slate-400` for muted
- Cards: `bg-white border border-slate-200 rounded-2xl shadow-sm`
- Accent colors: violet for AI/decisions, emerald for deployments/success, rose for incidents/errors, amber for warnings

## App Structure

| Tab | Route | Description |
|---|---|---|
| Overview | `/` | AI sessions feed + incident trigger demo |
| Decisions | `/decisions` | Timeline of AI decisions with reasoning |
| Incidents | `/incidents` | Active incident detail — PR, logs, fix, responder |
| Connections | `/connections` | GitHub, Linear, Vercel integrations |

**Demo flow:** Trigger button on Overview → Slack notification UI appears → "View incident in Nexus →" navigates to `/incidents` → full root cause analysis with AI fix suggestion

---

## Mock Data

All data is frontend mock only (no backend connection yet). Source of truth: `web/lib/mock-data.ts`

Pre-scripted incident: **"Auth service: 500 errors on POST /api/auth/refresh"** — traced to JWT migration in `sess_01`, PR #47, `deploy_01`.

---

## Hackathon Context

- **Event:** FoundersHack Sydney 2026
- **Submission deadline:** Sunday, 22 March 2026, 11:59 PM (Devpost)
- **Pitch Night:** Thursday, 26 March 2026
- **Judges:** Anh Dao (Lyra), Dan Coughlan (Airtree), Anubhav Ghosh (Blackbird)

**Judging weights:**
| Category | Weight |
|---|---|
| Problem | 25% |
| Solution | 25% |
| Prototype Execution | 20% |
| Presentation | 20% |
| Business Case | 10% |

**Prototype band to target:** Interactive running web app (85–100% band) — not just Figma.

**Required deliverables:**
- Pitch video < 7 min
- Product demo < 3 min
- Code on GitHub
- Daily Discord progress updates (Friday 11:59 PM + Saturday 11:59 PM)

**Competitors to be aware of:**
- Vercel Agent — fixes build errors from logs (no decision context)
- Gryph — forensics for individual devs (no team layer, no incident response)
- Unyform — AI governance / audit trails (different angle)
