# Company Brain Viewer

Command Center for Company Brain markdown and text files. Browse MinIO knowledge and edit files in place (TipTap); saves overwrite objects and stamp `updated_on` / `edited_via: viewer` on markdown frontmatter.

Protected by **app-level session auth** (login cookie). Runtime knowledge is read/written via **MinIO** (same bucket as the MCP server), or `BRAIN_ROOT` for fixture-only local trees. No database.

## Requirements

- Node 20+
- MinIO bucket with canonical knowledge objects (or `BRAIN_ROOT` for fixture-only local trees)
- `VIEWER_AUTH_USER`, `VIEWER_AUTH_PASSWORD`, `VIEWER_SESSION_SECRET` (≥32 chars)

## Setup

```bash
cd viewer
npm install
cp .env.example .env
# Set MINIO_* and VIEWER_AUTH_* / VIEWER_SESSION_SECRET
```

Migrate existing local folders once via `mcp-server/migrate_to_minio.py` before relying on MinIO.

## Run (local)

```bash
npm run dev
```

- UI: http://127.0.0.1:5173
- API: http://127.0.0.1:8787 (loopback by default)

Sign in with `VIEWER_AUTH_USER` / `VIEWER_AUTH_PASSWORD`.

### Views

- **Command center** — brain-derived overview (identity, domain scorecards, products, pulse, attention gaps)
- **Company** — dashboard summarizing `01-COMPANY` (identity, claim completeness, area coverage, audience, strategy, team, activity, gaps)
- **Domain dashboards** — Brand, Products, Projects, Team, Departments, Research, Content, References, Assets, Outputs (`GET /api/domain?prefix=…`). Use **Browse files** for the domain tree.
- **Browse all** — full canonical tree (`01-COMPANY` … `10-OUTPUTS`)

Selecting a file opens the document pane. Use **Edit** to change markdown (TipTap) or plain text; **Save** calls `PUT /api/file` and writes to MinIO (or local fixtures). Frontmatter is shown below the chrome; provenance stamps are applied on the server.

**Upload:** In a domain browse panel, use **Upload** to add a `.md` or `.html` file into the current folder (filename editable before confirm). Existing paths are overwritten. New markdown without `status` is stamped `proposed` plus `updated_on` / `edited_via: viewer` (`POST /api/file/upload`). Browse-all root requires opening a domain first.

**Knowledge status:** On markdown files, use the Knowledge status control to set `proposed`, `approved`, `confirmed`, `unverified`, `conflicting`, or `superseded` (`PATCH /api/file/status`). Approving asks for a named `approved_by` and stamps `approval_date`. Status changes are blocked while body edits are unsaved.

Overview data comes from `GET /api/overview`; company from `GET /api/company`; other folders from `GET /api/domain` (file counts and frontmatter only — no invented SaaS KPIs).

MCP `push_file` remains available for proposed syncs from other brains; the viewer uses direct overwrite for in-app editing and status changes.

## Production (Vercel / Royal Platform)

Project root directory: `viewer/`. Team: **royal-platform**.

Required Production env:

| Variable | Example |
|----------|---------|
| `MINIO_ENDPOINT` | `khoadue.me:9000` |
| `MINIO_SECURE` | `false` |
| `MINIO_BUCKET` | `company-brain` |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | (secrets) |
| `VIEWER_AUTH_USER` / `VIEWER_AUTH_PASSWORD` | (secrets) |
| `VIEWER_SESSION_SECRET` | ≥32 random chars |
| `VIEWER_CORS_ORIGIN` | production URL |
| `NEO4J_URI` or `NEO4J_DBMS` | `neo4j+s://….databases.neo4j.io` |
| `NEO4J_USERNAME` / `NEO4J_PASSWORD` | Aura credentials |
| `NEO4J_DATABASE` | usually `neo4j` |

Note: MinIO over plain HTTP means Vercel→MinIO credentials travel without TLS until the bucket endpoint is HTTPS.

## Tests

```bash
npm test
```

Tests use `LocalFsStore` against `tests/fixtures/brain` (no MinIO required).
