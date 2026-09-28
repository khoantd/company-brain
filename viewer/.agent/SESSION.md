# Agent session

> Cross-tool handoff state for Cursor, Claude Code, and Kiro. Update at session end (`/handoff`) or phase changes; read at session start (`/resume`).

## Meta

| Field | Value |
|-------|-------|
| **Updated** | 2026-09-28 |
| **Phase** | build |
| **Tool** | cursor |
| **Persona** | frontend |

## Goal

Reduce app loading time (first paint + post-login API latency on MinIO).

## Done

- React.lazy + Suspense for dashboards, DocumentView, and Neo4j graph views in `src/App.tsx`
- Extracted `HtmlLayoutMode` to `src/lib/html-layout.ts`
- Lazy-load TipTap `MarkdownEditor` only while editing markdown
- Vite `manualChunks`: react-vendor, neo4j-arc, tiptap, markdown
- `listTree` rebuilt from flat `listFiles` (no per-dir MinIO ListObjects); `childrenFromFilePaths` + tests
- `buildOverview` parallelized; 45s TTL cache for tree/overview with invalidate on writes
- `readBrainFile` skips Head for text (size from content)
- Entry JS ~56 kB / 18 kB gzip; neo4j-arc + tiptap deferred to separate chunks
- All 73 tests pass; production build ok

## In progress

- _(none)_

## Next

1. Optional: deploy and verify cold load on production
2. Optional: prefetch `api.file` on FileTree hover
3. Optional polish from prior session: ProductGraphView header, Vercel TS warnings, `/graph/:slug` routing

## Decisions

- Process-local TTL cache (no Redis) — enough for warm Vercel instances
- Tree built from `listFiles` flat listing, not recursive `listChildren`

## Gotchas

- TipTap chunk still ~520 kB — only loaded on edit
- neo4j-arc chunk ~256 kB — only on Knowledge graph views
- DocumentView still loads markdown chunk when opening a file (expected for read path)

## Pointers

| Item | Location |
|------|----------|
| Lazy App views | `src/App.tsx` |
| Tree from paths | `server/brain.ts` (`childrenFromFilePaths`, `listTree`) |
| Response cache | `server/response-cache.ts`, wired in `server/app.ts` |
| Chunk config | `vite.config.ts` `build.rollupOptions.output.manualChunks` |
| Tests | `tests/tree-from-paths.test.ts`, `tests/response-cache.test.ts` |
