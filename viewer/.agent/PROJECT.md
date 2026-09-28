# Project structure map

> Persistent overview for AI agents. Generated on first run by `/understand` (see `.cursor/commands/understand-project.md`). Update when architecture changes significantly.

## Meta

| Field | Value |
|-------|-------|
| **Updated** | 2026-09-27 |
| **Tool** | cursor |

## Stack

- **Language:** TypeScript (ESM)
- **UI:** React 19 + Vite 8 + Tailwind CSS 4 + TanStack Query
- **Editor:** TipTap (markdown) + react-markdown / rehype-sanitize
- **API:** Express 5 (`server/`), cookie session auth
- **Storage:** MinIO via `@aws-sdk/client-s3` (`MinioStore`) or local fixtures (`LocalFsStore` / `BRAIN_ROOT`)
- **Deploy:** Vercel (`api/index.ts` serverless entry; `vercel.json` rewrites all → `/api`)
- **Test / lint:** Vitest + Supertest; oxlint

## Layout

| Path | Purpose |
|------|---------|
| `src/` | React SPA — App shell, views, TipTap editors, API client |
| `server/` | Express app, auth, brain file/domain/overview/company logic, store adapters |
| `api/` | Vercel serverless entry (`createApp` + static serve) |
| `tests/` | Vitest suite + `fixtures/brain` (no MinIO required) |
| `public/` | Static assets (favicon, icons) |
| `tasks/` | Sprint checklist (`todo.md`) |
| `.agent/` | Session handoff + this project map |
| `.cursor/` / `.claude/` / `.kiro/` / `.agents/` | Multi-tool AI agent scaffolding (synced) |

## Entry points

- **Web (dev):** `src/main.tsx` → `src/App.tsx` (Vite `:5173`)
- **API (dev):** `server/index.ts` → `createApp` (`VIEWER_API_HOST`/`PORT`, default `127.0.0.1:8787`)
- **API (Vercel):** `api/index.ts` → same `createApp` with `serveStatic` / secure cookies
- **App factory:** `server/app.ts` — `createApp`
- **Store bootstrap:** `server/create-store.ts` — MinIO if `MINIO_*` set, else local FS

## Key files

- `server/app.ts` — routes: health, session, tree, file CRUD/status/upload, overview, company, domain
- `server/brain.ts` — read/write/list/upload/status for brain objects
- `server/store.ts` — `BrainStore` / `StoreEntry` interface
- `server/minio-store.ts` / `server/local-fs-store.ts` — storage backends
- `server/auth.ts` — session cookie + env-based credentials
- `server/overview.ts` / `company.ts` / `domain.ts` — dashboard aggregation from frontmatter
- `src/api.ts` — browser API client
- `src/components/command|company|domain|editor|shell/` — view modules
- `vite.config.ts` — Vite + API proxy
- `vercel.json` — build + rewrite to `/api`
- `.env.example` — MinIO + `VIEWER_AUTH_*` / `VIEWER_SESSION_SECRET`

## Commands

| Action | Command |
|--------|---------|
| Install | `npm install` |
| Dev | `npm run dev` (API + Vite via concurrently) |
| API only | `npm run dev:api` |
| Web only | `npm run dev:web` |
| Test | `npm test` |
| Build | `npm run build` |
| Lint | `npm run lint` |

## Code intelligence

| Item | Status |
|------|--------|
| CodeGraph index | Present — 113 files, ~2925 nodes (`.codegraph/`) |
| Workspace root | `/Volumes/Data/Software Development/TypeScript/company-brain/viewer` |
| OntoSight | `npx royalsolution-ontosight@0.2.1 "<workspace-root>"` |

## Notes

- Lives under monorepo parent `company-brain/`; this package root for Vercel is `viewer/`.
- No database — knowledge is markdown/text in MinIO (or fixture tree). Viewer overwrites objects and stamps frontmatter (`updated_on`, `edited_via: viewer`, knowledge `status`).
- Auth is app-level session cookies (`VIEWER_AUTH_USER` / `VIEWER_AUTH_PASSWORD` / `VIEWER_SESSION_SECRET` ≥32 chars), not a user DB.
- MCP `push_file` is separate (proposed sync); in-app edits use direct overwrite.
- SESSION.md is still a blank template — no prior feature handoff yet.
