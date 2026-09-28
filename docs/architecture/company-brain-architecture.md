---
title: Company Brain architecture
type: output
status: proposed
---

# Company Brain — System Architecture

Runtime architecture of the Company Brain knowledge system: Command Center viewer on Vercel, session-gated Express API, MinIO knowledge store, and the dedicated `company-brain-mcp` sync path. Drawn as an Archify showcase-quality architecture diagram in an interactive standalone HTML viewer with pan/zoom, search, theme toggle, and PNG/SVG export.

## Artifact

- **File**: `company-brain-architecture.html` (self-contained, no external assets)
- **Size**: 720,724 bytes (~704 KB)
- **SHA-256**: `b6df3f1806bcbcd98998017238d2724bc4124a6333a1bc47390fbf58156e48f9`
- **Renderer**: Archify (showcase profile, 9/9 deterministic checks green)
- **Spec**: `docs/architecture/company-brain.architecture.json` in the monorepo
- **Open**: Any modern browser — no server required

## What it covers

Operators browse and edit knowledge through the React Command Center SPA hosted on Vercel (`royal-platform` / `company-brain-viewer`). App-level session cookies gate Express `/api/*`. The API reads and writes the MinIO `company-brain` bucket (`khoadue.me:9000`) for folders `01-COMPANY` … `10-OUTPUTS`. AI agents reach the same bucket through `company-brain-mcp` (FastMCP / Horizon). `11-SYSTEM` operating docs stay in Git.

## Components (9)

| Node | Role |
|---|---|
| Operators | Browser users |
| AI Agents | Cursor / Claude / MCP clients |
| Command Center | React + Vite SPA |
| Vercel | royal-platform hosting + Fluid Compute |
| Session Auth | cookie + `VIEWER_AUTH_*` |
| Express API | `/api/*` tree, dashboards, edit, upload, status |
| MinIO | `company-brain` bucket — runtime knowledge |
| company-brain-mcp | FastMCP / Horizon tools |
| Git repo | `11-SYSTEM` only |

## Guided views

1. **Operator request path** — Browser → SPA → Vercel → Express → MinIO
2. **Session auth gate** — cookie verification before protected `/api` store access
3. **Agent MCP sync** — Agents → MCP tools → MinIO (`push_file` stays proposed until human promotion)

## Boundaries

- **Vercel / Royal Platform** wraps Command Center, Vercel edge, Session Auth, Express API
- **session-gated /api** security group wraps Auth + API
- **Runtime knowledge (01–10)** wraps MinIO

## Key design decisions

- Viewer saves **overwrite** objects and stamp `edited_via: viewer`; MCP `push_file` remains create/proposed for other brains
- Runtime knowledge lives in MinIO only; `11-SYSTEM` stays in Git
- MCP extracted to a dedicated FastMCP repo (Horizon OAuth), not the monorepo `mcp-server/` pointer
- Local fixtures use `LocalFsStore` when `MINIO_*` is unset

## Regeneration

Re-render from `docs/architecture/company-brain.architecture.json` with:

```bash
cd .cursor/skills/archify
node bin/archify.mjs deliver architecture \
  ../../docs/architecture/company-brain.architecture.json \
  ../../docs/architecture/company-brain-architecture.html \
  --quality showcase
```
