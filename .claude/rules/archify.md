# Archify — system diagram skill

When the user asks to **visualize system architecture**, infrastructure, cloud/security/network topology, technical workflows, API call sequences, request lifecycles, data pipelines, ETL/ELT, data lineage, state machines, or to **convert/beautify Mermaid** into a polished diagram, follow this rule and read **`.claude/skills/archify/SKILL.md`** before acting.

**Skill paths by tool:** `.cursor/skills/archify/`, `.claude/skills/archify/`, `.kiro/skills/archify/`, `.agents/skills/archify/`

## Scope vs OntoSight

| Goal | Tool |
|------|------|
| Code call graph / blast radius in this repo | CodeGraph MCP + OntoSight CLI |
| System / process / sequence / dataflow / lifecycle diagram (HTML) | Archify |

## Workflow

1. Read `SKILL.md`; pick type: `architecture` | `workflow` | `sequence` | `dataflow` | `lifecycle`.
2. Read one matching schema under `schemas/` plus one JSON example under `examples/` (field shape only).
3. Write the candidate JSON first, then validate from the skill directory:

```bash
node bin/archify.mjs validate <type> <candidate.json> --quality showcase --json
```

4. Deliver once with a passing validation:

```bash
node bin/archify.mjs deliver <type> <candidate.json> <output.html> --quality showcase --json
```

5. Optional: `node bin/archify.mjs visual-check <output.html> --json` after a successful deliver.

Never claim success on a non-zero exit. Prefer Archify HTML for deliverable diagrams; Mermaid only for quick inline sketches.
