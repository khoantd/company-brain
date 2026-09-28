# Project structure map

> Persistent overview for AI agents. Generated on first run by `/understand`. Update when architecture changes significantly.

## Meta

| Field | Value |
|-------|-------|
| **Updated** | 2026-09-21 |
| **Tool** | cursor |

## Stack

**Type:** File-based company knowledge management system — not a traditional web/API app.

| Layer | Detail |
|-------|--------|
| **Framework** | AI Tooltip Company Brain v1.0.0 |
| **Primary AI tool** | Any file-aware AI assistant (Cursor, Claude, Copilot, Ollama, etc.) |
| **Adapter tools** | Optional integrations: Claude Code (`CLAUDE.md`), Cursor (`.cursor/`), Kiro (`.kiro/`), Antigravity (`GEMINI.md`) |
| **Scripts** | Python 3 (`11-SYSTEM/scripts/`) |
| **Config/schemas** | JSON schema (`11-SYSTEM/schemas/`) |
| **Knowledge files** | Markdown throughout `00-INBOX` → `10-OUTPUTS` |
| **No package.json** | No Node/npm build — CodeGraph indexes Python + YAML only |

## Layout

| Path | Purpose |
|------|---------|
| `00-INBOX/` | Unsorted source material awaiting AI-assisted processing |
| `00-MIGRATE-OLD-SETUP/` | Intake folder for previous AI Tooltip / codex-design-studio setups |
| `01-COMPANY/` | Company identity: COMPANY.md, strategy, audience, team, decisions, goals, history, activity |
| `02-DEPARTMENTS/` | Department-scoped AI instructions: Analytics, Business, Creative, Product-and-Development |
| `03-BRAND/` | Brand, positioning, voice, visual guidance, design system |
| `04-PRODUCTS/` | Durable product and service records |
| `05-PROJECTS/` | Time-bounded project records and execution state |
| `06-RESEARCH/` | Questions, evidence, findings, limitations |
| `07-CONTENT/` | Content plans, briefs, drafts, approved records |
| `08-REFERENCES/` | Source and inspiration material with provenance |
| `09-ASSETS/` | Source, working, and approved reusable assets |
| `10-OUTPUTS/` | Project deliverables and reports |
| `11-SYSTEM/` | Provider-independent OS, workflows, schemas, templates, migrations, scripts |
| `.company-brain/` | Local-only user identity file (gitignored) |
| `.cursor/` | Cursor-specific rules, commands, agents, skills |
| `.claude/` | Claude Code adapter, skills |
| `.kiro/` | Kiro steering, commands |
| `.agents/` | Antigravity workflows, skills |
| `.agent/` | Cross-tool session continuity (SESSION.md, PROJECT.md) |
| `tasks/` | todo.md for cross-session task tracking |
| `brain.config.json` | Root configuration: paths, governance, status vocabulary |

## Entry points

- **`brain.config.json`** — root config; all AI tools read this first
- **`11-SYSTEM/OPERATING-SYSTEM.md`** — canonical, provider-independent AI rules (read before any task)
- **`AGENTS.md`** — Generic AI agent adapter (primary entry point for any AI tool)
- **`CLAUDE.md`** — Claude Code lightweight adapter
- **`.cursor/CURSOR.md`** — Cursor agent workflow hub
- **`GEMINI.md`** — Antigravity adapter
- **`11-SYSTEM/workflows/`** — named AI workflows triggered by natural language commands

## Key files

| File | Role |
|------|------|
| `11-SYSTEM/OPERATING-SYSTEM.md` | Master AI rules, authority hierarchy, proposal vs. decision logic |
| `brain.config.json` | Path registry, governance flags, status vocabulary |
| `START-HERE.md` | First-time user quickstart |
| `COLLABORATION.md` | Solo vs. team GitHub workflow |
| `PRIVACY.md` | Data handling and provider privacy guidance |
| `11-SYSTEM/workflows/*.md` | Triggered by natural language: setup, inbox, decisions, updates, etc. |
| `11-SYSTEM/schemas/` | JSON schemas for brain-config and other structured files |
| `11-SYSTEM/scripts/validate_brain.py` | Framework integrity validator |
| `11-SYSTEM/migrations/` | Version migration scripts |
| `01-COMPANY/decisions/` | Approved company decisions (authoritative source) |
| `01-COMPANY/COMPANY.md` | Core company identity record |
| `.company-brain/current-user.md` | Local-only identity file (gitignored, from `current-user.example.md`) |
| `tasks/todo.md` | Cross-session task checklist |

## Commands

| Action | Command |
|--------|---------|
| Validate framework | `python3 11-SYSTEM/scripts/validate_brain.py` |
| Natural language commands | "Set up my company brain", "Process the inbox", "Record this approved decision", "Check for AI Tooltip updates" |

## Key workflows (11-SYSTEM/workflows/)

| Workflow file | Triggered by |
|---------------|-------------|
| `initialize-company-brain.md` | "Set up my company brain" |
| `process-inbox.md` | "Process the inbox" |
| `record-approved-decision.md` | "Record this approved decision" |
| `log-meaningful-activity.md` | "Log this as meaningful activity" |
| `start-project.md` | "Start a project" |
| `onboard-team-member.md` | "Onboard a team member" |
| `migrate-previous-ai-tooltip-setup.md` | "Migrate my previous AI Tooltip setup" |
| `check-for-ai-tooltip-updates.md` | "Check for AI Tooltip updates" |
| `apply-approved-update.md` | "Apply the approved update" |
| `greet-and-orient-user.md` | "Hi" / "Hello" |

## Code intelligence

| Item | Status |
|------|--------|
| CodeGraph index | ✅ Present — `.codegraph/codegraph.db` (71 files, 2376 nodes, Python + YAML) |
| Workspace root | `/Volumes/Data/Software Development/TypeScript/company-brain` |
| OntoSight | `npx royalsolution-ontosight@0.2.1 "/Volumes/Data/Software Development/TypeScript/company-brain"` |

## Notes

- This is a **knowledge management system**, not an application. There is no build step, no server, no frontend.
- **Governance is enforced by the OS rules** (`OPERATING-SYSTEM.md`): AI proposes, humans approve consequential decisions. AI never silently updates canonical company knowledge.
- **Status vocabulary** for all records: `approved`, `confirmed`, `proposed`, `unverified`, `conflicting`, `superseded`.
- **Authority order** (when sources conflict): current-task human instruction → approved decisions → canonical records → project records → research → references → inbox.
- User identity lives in `.company-brain/current-user.md` (gitignored). Do not commit this file. Copy from `current-user.example.md`.
- Framework updates come from [aitooltip/company-brain](https://github.com/aitooltip/company-brain) via the "Check for AI Tooltip updates" workflow — never auto-applied.
- Keep `.claude/`, `.cursor/`, `.kiro/`, `.agents/` in sync after editing `.cursor/` (canonical) — run `npm run sync:all` if available.
