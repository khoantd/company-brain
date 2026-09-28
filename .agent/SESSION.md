# Agent session

> Cross-tool handoff state for Cursor, Claude Code, and Kiro. Update at session end (`/handoff`) or phase changes; read at session start (`/resume`).

## Meta

| Field | Value |
|-------|-------|
| **Updated** | 2026-09-21 |
| **Phase** | build |
| **Tool** | cursor |
| **Persona** | |

## Goal

Ship Company Brain viewer to Vercel production under Royal Platform with app-level auth and public MinIO.

## Done

- Approved company identity, business model, and company-level approval authority in `01-COMPANY/COMPANY.md`
- Primary audience: SME companies in `01-COMPANY/audience.md`
- Products: `04-PRODUCTS/crm/PRODUCT.md`, `04-PRODUCTS/erp/PRODUCT.md`, `04-PRODUCTS/ai-enterprise-system/PRODUCT.md`
- Team profile `01-COMPANY/team/nguyen-tran-doan-khoa.md`
- Local identity `.company-brain/current-user.md` (gitignored)
- Activity entry `01-COMPANY/activity/2026-09.md`
- Implemented `viewer/` as a brain browser (tree + markdown/text document view)
- Removed Mobbin OAuth, search, gallery, and citation save from the viewer
- Redesigned viewer as Command Center: dark Operating Views sidebar, `/api/overview`, scorecards/gaps/products/pulse, domain-filtered browse + document drill-down
- Company dashboard: `/api/company` + Company nav view summarizing `01-COMPANY`
- Domain dashboards: `/api/domain?prefix=` for Brand, Products, Projects, Team, Departments, Research, Content, References, Assets, Outputs
- Export contract for filling folders from another app: `11-SYSTEM/EXPORT-FORMAT.md` (linked from `11-SYSTEM/templates/README.md`)
- MCP + viewer MinIO knowledge backend (viewer still in this monorepo)
- Imported Royal Solution export into MinIO; supplemented Products via Vercel dashboard inventory
- **Extracted MCP to dedicated repo** `company-brain-mcp` (Horizon-ready: `echo.py:mcp`, lazy MinIO, Horizon OAuth). Monorepo `mcp-server/` is a README pointer only.
- **Viewer TipTap editor** — Edit/Save for markdown + text; `PUT /api/file` overwrites MinIO/local; stamps `updated_on` + `edited_via: viewer` on markdown frontmatter
- **Viewer knowledge status workflow** — document-pane control + `PATCH /api/file/status`; OS statuses; approve requires `approved_by` + stamps `approval_date`
- **Viewer upload** — domain FileTree Upload for `.md`/`.html` into current folder; `POST /api/file/upload` create-or-overwrite; new md defaults `status: proposed`
- **Viewer HTML preview** — `.html` docs get Preview | Source | Both; sandboxed `srcDoc` iframe; Preview/Both full-bleed (sidebar auto-collapses, FileTree hides); Both is side-by-side
- **Viewer app-level auth** — session cookie (`VIEWER_AUTH_*` / `VIEWER_SESSION_SECRET`); login UI; API middleware 401 without session
- **Viewer on Vercel (Royal Platform)** — project `company-brain-viewer` (`prj_pgoUwdmPQ5SeI5QXnVZa3k8Vx2uZ`); prod alias https://company-brain-viewer.vercel.app; MinIO `khoadue.me:9000`

## In progress

- Publish / connect `khoantd/company-brain-mcp` on GitHub + Horizon (local path ready; `gh` auth may need refresh to create remote)
- Optional: connect GitHub app to Vercel for this repo (CLI deploy works; Git link failed without GitHub App)

## Next

1. Sign in at https://company-brain-viewer.vercel.app using `VIEWER_AUTH_USER` / `VIEWER_AUTH_PASSWORD` from `viewer/.env`
2. Optionally install Vercel GitHub App and link `khoantd/company-brain` for git-based deploys
3. Prefer HTTPS for MinIO when available (prod currently uses HTTP `khoadue.me:9000`)
4. `gh auth login` if needed → create/push `khoantd/company-brain-mcp` → Horizon deploy
5. Optional: Proposed-status inbox across the brain; TipTap code-split

## Decisions

- Business model is both client SaaS delivery and Royal Solution's own SaaS products
- Viewer scope is Company Brain contents only — no Mobbin integration in the app
- Runtime knowledge (`01-COMPANY`…`10-OUTPUTS`) lives in MinIO only; `11-SYSTEM` stays in git
- MCP lives in dedicated FastMCP repo; Cloud auth = Horizon org OAuth (no BRAIN_MCP_API_KEYS on Cloud)
- Viewer save = direct overwrite + FM stamp (`edited_via: viewer`); MCP `push_file` remains create/proposed for other brains
- Viewer status changes use OPERATING-SYSTEM knowledge states; approving requires a named human (no invented approver)
- Viewer upload lands in the currently browsed domain folder; conflict = overwrite; extensions = `.md` / `.html` only
- Viewer production access = app-level session auth (not public anonymous writes)

## Gotchas

- Local MCP package: `/Volumes/Data/Software Development/Python/mcp-hub/company-brain-mcp`
- Horizon entrypoint: `echo.py:mcp`; `fastmcp inspect echo.py:mcp` must show 5 tools without MinIO
- Viewer needs `MINIO_*` plus `VIEWER_AUTH_*` / `VIEWER_SESSION_SECRET`; production fails without them
- Vercel MCP `list_projects` may still return empty (OAuth scope); CLI `vercel project ls --scope royal-platform` works
- Deploy from monorepo root when project Root Directory is `viewer` (linking only from `viewer/` nests to `viewer/viewer`)
- Vercel static+catch-all broke nested `/api/*/*`; prod uses rewrite-all → `api/index` Express (`serveStatic`)
- Auth routes are `/api/session/*` (not `/api/auth/*`)
- Viewer write API requires session cookie in prod; do not disable auth
- Login credentials live in `viewer/.env` (`VIEWER_AUTH_USER` / `VIEWER_AUTH_PASSWORD`) — same values set on Vercel Production

## Pointers

| Item | Location |
|------|----------|
| Spec | `11-SYSTEM/workflows/initialize-company-brain.md` |
| Viewer | `viewer/README.md` |
| Prod | https://company-brain-viewer.vercel.app |
| MCP | `mcp-server/README.md` → `https://github.com/khoantd/company-brain-mcp` (local: `.../mcp-hub/company-brain-mcp`) |
| Tasks | |
| Branch | `main` |
| Key files | `viewer/server/app.ts`, `viewer/server/auth.ts`, `viewer/api/index.ts`, `viewer/vercel.json` |
