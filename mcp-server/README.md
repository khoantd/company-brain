# Company Brain MCP (moved)

The MCP server now lives in a dedicated FastMCP / Prefect Horizon repo:

**Local package (ready):**  
`/Volumes/Data/Software Development/Python/mcp-hub/company-brain-mcp`

**GitHub (create/push when ready):**  
`https://github.com/khoantd/company-brain-mcp`

```bash
cd "/Volumes/Data/Software Development/Python/mcp-hub/company-brain-mcp"
gh auth login   # if needed
gh repo create company-brain-mcp --private --source=. --remote=origin --push
```

## Why separate?

Horizon deploys from a GitHub repo root with `echo.py:mcp` and `pyproject.toml`. A dedicated package avoids monorepo dependency detection issues and matches the FastMCP Cloud workflow.

## Auth

Use **Horizon organization OAuth** (enable Authentication in the Horizon UI). Do not rely on `BRAIN_MCP_API_KEYS` for Cloud.

## Env

Set MinIO vars in Horizon (and locally in the new repo’s `.env`):

- `MINIO_ENDPOINT`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `MINIO_BUCKET`
- `MINIO_SECURE`

See the new repo’s README for deploy steps and tools.
