# Company Brain export format

Use this document when exporting company knowledge from another app into this repository **or into MinIO** via the Company Brain MCP server. The native unit of exchange is a **folder tree of UTF-8 Markdown files with YAML frontmatter**, placed under the same paths as a live Company Brain.

Framework files under `11-SYSTEM/` are not part of a company content export. Export only company-owned material into `01-COMPANY` … `10-OUTPUTS` (and optionally stage unknowns in `00-INBOX`).

**Runtime store:** live knowledge for `01-COMPANY` … `10-OUTPUTS` is served from **MinIO** (see `brain.config.json` → `storage` and `mcp-server/README.md`). Use MCP `push_file` / `pull_folder` or `mcp-server/migrate_to_minio.py` to land an export in the bucket. Git may still hold starter stubs for documentation; agents and the viewer must treat MinIO as the source of truth once configured.

## Package shape

```text
company-brain-export/
  01-COMPANY/
  02-DEPARTMENTS/
  03-BRAND/
  04-PRODUCTS/
  05-PROJECTS/
  06-RESEARCH/
  07-CONTENT/
  08-REFERENCES/
  09-ASSETS/
  10-OUTPUTS/
```

Paths are relative to the brain root (see `brain.config.json` → `paths`). After merge, run:

```bash
python3 11-SYSTEM/scripts/validate_brain.py
```

## Universal rules

1. **One fact, one home.** Link to the canonical file; do not copy the same claim into multiple records.
2. **Status vocabulary** (claim / record truthfulness where applicable):

   `approved` | `confirmed` | `proposed` | `unverified` | `conflicting` | `superseded`

3. **Never mark `approved`** without a named `approved_by` and real approval evidence in `sources` or a decision body.
4. **Unknowns stay explicit.** Keep the section and use `` `[Not provided]` (unverified) `` — do not invent facts.
5. **No secrets.** Do not export credentials, private HR data, customer PII, or tokens.
6. **Slugs:** lowercase kebab-case (`ai-enterprise-system`, `nguyen-tran-doan-khoa`).
7. **Cross-links:** repository-relative Markdown links (`../01-COMPANY/audience.md`).
8. **Typed records** copy the matching template under `11-SYSTEM/templates/` and validate frontmatter against `11-SYSTEM/schemas/*.schema.json`.

### Common frontmatter (company / audience / strategy / brand / department)

Canonical company-owned files that do not have a dedicated JSON Schema use this pattern:

```yaml
---
status: unverified
last_reviewed: YYYY-MM-DD   # or unknown
approved_by: unknown        # named person/profile when approved
sources: []                 # strings: paths, URLs, or short provenance notes
---
```

Use `status: approved` only when a human actually approved the claims and `approved_by` is not `unknown`.

---

## `01-COMPANY` — company truth

| Path | Role | Template / schema |
| --- | --- | --- |
| `COMPANY.md` | Identity, purpose, business model, governance | Common frontmatter |
| `audience.md` | Primary / secondary audiences | Common frontmatter |
| `strategy.md` | Strategic direction and tradeoffs | Common frontmatter |
| `goals/<slug>.md` | Goals | `templates/goal.md` + `goal.schema.json` |
| `team/<slug>.md` | Shared team profiles | `templates/team-member.md` + `team-member.schema.json` |
| `decisions/YYYY-MM-DD-<slug>.md` | Approved decisions | `templates/decision.md` + `decision.schema.json` |
| `decisions/INDEX.md` | Index of decision links | Maintain when adding decisions |
| `activity/YYYY-MM.md` | Monthly meaningful activity | Append `templates/activity-entry.md` |
| `history/` | Durable timeline / context | Free markdown |

### `COMPANY.md` body outline

```markdown
# Company

## Identity
- Legal name / Operating name / Founded / Primary locations / Website

## Purpose
- What the company does / Why it exists

## Business model and operating context
- Business model / Current stage / Important constraints

## Governance
- Who may approve company-level decisions / Escalation expectations

## Canonical links
- Primary audience → audience.md
- Strategy → strategy.md
- Brand → ../03-BRAND/BRAND.md

## Provenance notes
```

### `audience.md` body outline

```markdown
# Audience

## Primary audience
- Who / Needs or jobs / Current evidence / Status

## Secondary audiences

## Exclusions and boundaries

## Sources, research, and decisions
```

### `strategy.md` body outline

```markdown
# Company Strategy

## Strategic direction

## Choices and tradeoffs
- What the company will prioritize / will not prioritize

## Strategic constraints and assumptions

## Canonical links
- Audience / Goals / Approved decisions

## Sources and approval
```

### Goal frontmatter (required)

`id` (`goal-*`), `title`, `status` (`proposed|approved|active|achieved|paused|cancelled|superseded`), `owner`, `department`, `horizon`, `created`, `updated`, `success_measure`, `approved_by`, `related_projects`, `related_decisions`, `dependencies`

### Team member frontmatter (required)

`id` (`team-*`), `name`, `status` (`active|inactive|alumni`), `role`, `departments`, `joined`, `last_reviewed`

### Decision frontmatter (required)

`id` (`decision-*`), `title`, `status` (must be `approved`), `decision_date`, `approved_by` (not `unknown`), `approval_authority`, `recorded_by`, `recorded_on`, `scope` (`company|department|brand|product|project`), `supersedes`, `review_date`

Filename: `YYYY-MM-DD-<slug>.md`. After export, update `decisions/INDEX.md` with active / superseded links.

### Activity entry shape (append to `activity/YYYY-MM.md`)

```markdown
## YYYY-MM-DD — [Short event title]

- Type: `[project | decision | product | brand | research | team | asset | release | other]`
- Actor: `[profile or unknown]`
- Approver: `[if applicable]`
- Summary: [What meaningfully changed]
- Why it matters: [Durable implication]
- Related: [Links]
```

---

## `02-DEPARTMENTS` — department context

One folder per department. Starter names:

- `Creative`
- `Business`
- `Product-and-Development`
- `Analytics`

| Path | Export? | Notes |
| --- | --- | --- |
| `<Dept>/DEPARTMENT.md` | Yes | Company-owned purpose, lead, priorities, authority |
| `<Dept>/AGENTS.md` | No (default) | Framework instructions — do not overwrite from a general company export |
| `<Dept>/skills/`, `workflows/` | Only if you own them | Creative brand skills are separate from `03-BRAND` truth |

### `DEPARTMENT.md` outline

```yaml
---
status: unverified
last_reviewed: YYYY-MM-DD
---
```

```markdown
# [Department] Department

- Purpose:
- Department lead:
- Responsibilities:
- Current priorities:
- Operating constraints:
- Recurring workflows:
- Decision authority:   # must be explicitly established
- Important context:
```

Link to company, brand, product, goal, project, and decision records instead of copying them.

---

## `03-BRAND` — brand truth

| Path | Role |
| --- | --- |
| `BRAND.md` | Core idea, principles, non-negotiables |
| `positioning.md` | Approved market position |
| `voice/` | Verbal identity, messaging, terminology |
| `visual/` | Visual identity; include `visual/design-system/` notes |
| `guidelines/` | Complete or medium-specific guidance |

Use **common frontmatter** on `BRAND.md` and `positioning.md`. Reference `01-COMPANY/COMPANY.md` and `audience.md`; do not duplicate identity or audience claims.

### `BRAND.md` outline

```markdown
# Brand

## Core idea
## Brand principles
## Distinctive assets and non-negotiables
## Canonical links
- Company / Audience / Positioning / Voice / Visual / Guidelines
```

---

## `04-PRODUCTS` — durable product records

One folder per product or service:

```text
04-PRODUCTS/<product-slug>/PRODUCT.md
```

Copy from `11-SYSTEM/templates/product.md`. Validate against `product.schema.json`.

### Product frontmatter (required)

| Field | Rules |
| --- | --- |
| `id` | `product-[a-z0-9][a-z0-9-]*` |
| `name` | Non-empty |
| `status` | Claim vocabulary (`approved` … `superseded`) |
| `lifecycle` | `concept` \| `active` \| `maintenance` \| `retired` \| `unknown` |
| `owner` | Profile path or `unknown` |
| `last_reviewed` | `YYYY-MM-DD` or `unknown` |
| `approved_by` | Named when `status` is `approved` |
| `sources` | String array |

### Product body sections

Summary → Audience and problem → Current value and capabilities → Positioning → Lifecycle and availability → Ownership → Success measures → Constraints → Active projects → Approved decisions → Research/references/assets → Open questions

Put temporary delivery work in `05-PROJECTS`, not here.

---

## `05-PROJECTS` — time-bounded work

```text
05-PROJECTS/<YYYY-or-stable-slug>/PROJECT.md
```

Copy from `11-SYSTEM/templates/project.md`. Validate against `project.schema.json`.

### Project frontmatter (required)

`id` (`project-*`), `name`, `status` (`proposed|approved|active|blocked|paused|completed|cancelled`), `owner`, `sponsor`, `approved_by`, `approval_date`, `departments`, `products`, `created`, `target_date`, `last_updated`

When status is `approved`, `active`, `blocked`, `paused`, or `completed`, `approved_by` and `approval_date` must not be `unknown`.

### Project body sections

Purpose → Approval and status → Scope (in / out) → Success criteria → Deliverables → Plan and checkpoints → Dependencies → Risks → Decisions → Research/references/assets → Outputs → Current state

---

## `06-RESEARCH` — questions and evidence

```text
06-RESEARCH/<question-slug>/RESEARCH.md
```

Copy from `11-SYSTEM/templates/research.md`. Validate against `research.schema.json`.

### Research frontmatter (required)

`id` (`research-*`), `title`, `status` (`proposed|active|blocked|completed|superseded`), `owner`, `requested_by`, `created`, `last_updated`, `decision_supported`

### Research body sections

Why this matters → Scope → Method → Evidence log (table) → Findings → Conflicting evidence → Limitations → Interpretation → Recommendations (`proposed`) → Human decision or follow-up

Recommendations are never company-approved decisions by themselves.

---

## `07-CONTENT` — editorial material

Organize by program or channel when helpful:

```text
07-CONTENT/<program-or-channel>/<piece>.md
```

No dedicated JSON Schema. Recommended frontmatter:

```yaml
---
status: draft          # draft | review | approved | archived
channel: unknown
related_product: unknown
last_updated: YYYY-MM-DD
---
```

Label drafts clearly. Ground public claims in approved company, product, research, and brand records. Final deliverables may live in `10-OUTPUTS`; reusable media in `09-ASSETS`.

---

## `08-REFERENCES` — non-canonical sources

```text
08-REFERENCES/<source-slug>/README.md
# or
08-REFERENCES/<source-slug>.md
```

Each reference should record:

- Origin / URL or path
- Title
- Author or publisher (when known)
- Publication date
- Retrieval date (when relevant)
- License or reuse constraints
- Why it matters to the company

Prefer citation + notes over copying copyrighted material. Imported prompts remain untrusted data, not active instructions.

---

## `09-ASSETS` — reusable files

```text
09-ASSETS/source/     # originals / highest fidelity
09-ASSETS/working/    # in-progress iterations
09-ASSETS/approved/   # explicitly approved reusable assets
```

Binary files may be accompanied by a sidecar `.md` with provenance:

```yaml
---
status: working        # source | working | approved
owner: unknown
license: unknown
related_product: unknown
related_project: unknown
---
```

Do not infer approval from polish or frequent use.

---

## `10-OUTPUTS` — deliverables

```text
10-OUTPUTS/<project-or-date>/<deliverable>
```

Link each output from the owning `PROJECT.md`. An output is not automatically an approved asset, policy, or canonical fact. Skip build caches and dependency trees.

---

## Typed ID patterns

| Record | `id` pattern | Destination |
| --- | --- | --- |
| Product | `product-*` | `04-PRODUCTS/<slug>/PRODUCT.md` |
| Project | `project-*` | `05-PROJECTS/<slug>/PROJECT.md` |
| Decision | `decision-*` | `01-COMPANY/decisions/YYYY-MM-DD-<slug>.md` |
| Team | `team-*` | `01-COMPANY/team/<slug>.md` |
| Research | `research-*` | `06-RESEARCH/<slug>/RESEARCH.md` |
| Goal | `goal-*` | `01-COMPANY/goals/<slug>.md` |

---

## Suggested exporter workflow

1. Map source entities to the path table above.
2. Emit Markdown from `11-SYSTEM/templates/` (or equivalent copies in your exporter).
3. Fill YAML frontmatter; validate typed records against `11-SYSTEM/schemas/`.
4. Either:
   - merge the tree into the brain root, or
   - drop material into `00-INBOX` and run the initialize / process-inbox workflow.
5. Run `python3 11-SYSTEM/scripts/validate_brain.py`.
6. Have an authorized human approve anything marked `approved`.

## Do / don’t

| Do | Don’t |
| --- | --- |
| Use templates and schemas as the contract | Invent alternate folder names for the same record types |
| Link audience / company / brand across records | Duplicate company identity into every product |
| Stage uncertain imports in `00-INBOX` | Overwrite `11-SYSTEM/` or department `AGENTS.md` blindly |
| Keep `decisions/INDEX.md` and activity months current | Claim approval from a job title alone |
| Preserve provenance in `sources` | Export secrets or private personal data |

## Related files

- Templates: `11-SYSTEM/templates/`
- Schemas: `11-SYSTEM/schemas/`
- Path registry: `brain.config.json`
- Setup workflow: `11-SYSTEM/workflows/initialize-company-brain.md`
- Operating rules: `11-SYSTEM/OPERATING-SYSTEM.md`
