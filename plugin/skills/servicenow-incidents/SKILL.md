---
name: servicenow-incidents
description: |
  Manages ServiceNow incidents - create, query, update, and resolve IT incidents.
  Use when user asks to "create an incident", "check incident status",
  "find open incidents", "update an incident", "resolve a ticket",
  "assign an incident", "search ServiceNow tickets", "list my incidents",
  "escalate an incident", or "close a ticket".
license: MIT
metadata:
  author: Contoso IT
  version: "1.2"
---

# ServiceNow Incident Management

Enables Cowork to create, query, update, and resolve ServiceNow incidents through natural language.

## Workflow

### Creating an Incident
1. Gather: short description, category, urgency
2. Render a **create preview card** → ask **Create / Edit / Cancel**
3. "Edit" = user describes changes in chat (no inline forms). Loop to step 2.
4. On Create → call `create_incident`, return number + link
5. On Cancel → abandon, do not call the tool

Preview-then-create is intentional: incidents trigger SLA timers and page on-call.
### Single Incident
Call `get_incident` → respond with plain markdown FactSet. No card.
(For browsing many incidents, use `show_incident_dashboard` instead.)
### Querying Incidents
1. Call `search_incidents`
2. **≤3 results** → plain markdown table. **4+ results** → render list card. **0 / error** → text only.

### Single Incident
Call `get_incident` → respond with plain markdown FactSet. No card.

### Updating an Incident
1. `get_incident` to fetch current state
2. If changing **state, priority, or assignee** → render update preview (Before → After FactSet) → **Apply / Edit / Cancel**
3. Minor changes (description, work notes) → call `update_incident` directly

### Resolving an Incident
1. Render resolve preview (close code + close notes) → **Resolve / Edit / Cancel**
2. On Resolve → call `resolve_incident`

### Bulk Operations
Multiple updates/resolves in one turn → render one confirmation card listing all affected numbers. Wait for confirmation before any tool call.

## Card Rendering Rules

Use `render-ui`. **Max one card per response.** Cards are for **write
confirmations only** (create / update / resolve / bulk previews).

**Do NOT render a card for:** any viewing/listing/overview request (use
`show_incident_dashboard`), single `get_incident`, errors, or search results.
There is no "list card" in this skill anymore — browsing is the widget's job.

### Badge Styles

| Priority | Style | | State | Style |
|----------|-------|-|-------|-------|
| P1 Critical | Attention | | New | Informative |
| P2 High | Warning | | In Progress | Accent |
| P3 Moderate | Subtle | | On Hold | Warning |
| P4 Low | Default | | Resolved | Good |
| P5 Planning | Default | | Closed | Good |

P1/P2 open >24h → extra Attention badge with relative age (e.g. "Open 3d 14h").

Empty assignee → show "Unassigned" as subtle text.

**No `Input.*` or `Action.*` elements** — validator blocks them. Confirm via chat.

### Create Preview
- Header: "New Incident — Ready to Create"
- Emphasis container: short_description + description
- ColumnSet: Priority / Category / Impact / Urgency
- FactSet: Caller / Assignment Group / Assigned To
- Footer: "⚠ Nothing has been submitted yet"

### Update Preview
- Header: "Update Incident {number}"
- FactSet with "Before → After" per changed field
- Footer: "⚠ Not yet applied"

### Resolve Preview
- Header: "Resolve Incident {number}"
- FactSet: Close Code / Close Notes / Resolution Time
- Footer: "⚠ Not yet resolved"

### Bulk Confirmation
- Header: "Bulk {Action} — {N} Incidents"
- Table: Number / Description / Action per row
- Footer: "⚠ No changes have been made yet"

## Fallback (No Card)

Single incident → markdown key-value table. For any multi-incident view, call
`show_incident_dashboard` (the MCP App widget) rather than printing a table.

## References

- `references/servicenow-categories.md` — categories and subcategories
- `references/servicenow-priorities.md` — priority matrix and SLA targets
