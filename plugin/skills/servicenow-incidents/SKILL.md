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
  version: "1.0"
---

# ServiceNow Incident Management

## What This Skill Does

Enables Cowork to manage ServiceNow incidents through natural language, including:
- Creating new incidents with proper categorization
- Querying incidents by number, status, assignee, or priority
- Updating incident fields (priority, assignment, description)
- Resolving and closing incidents with resolution notes
- Escalating incidents to different assignment groups

## Workflow

### Creating an Incident
1. Gather required fields from user: short description, category, urgency
2. Use the `create_incident` tool to create the incident in ServiceNow
3. Return the incident number and link to the user

### Querying Incidents
1. Determine search criteria from user request (status, assignee, priority, date range)
2. Use the `search_incidents` tool to find matching incidents
3. Present results in a structured table

### Updating an Incident
1. Identify the incident number from user request
2. Use the `get_incident` tool to retrieve current state
3. Use the `update_incident` tool to apply changes
4. Confirm the update to the user

### Resolving an Incident
1. Get the incident number and resolution notes from the user
2. Use the `resolve_incident` tool to close the incident
3. Confirm resolution with the incident details

## Output Format

Present incident data in structured tables:

| Field | Value |
|-------|-------|
| Number | INC0010042 |
| Short Description | Email server not responding |
| Priority | 2 - High |
| State | In Progress |
| Assigned To | John Smith |
| Assignment Group | Network Operations |

For search results:

| Number | Description | Priority | State | Assigned To |
|--------|-------------|----------|-------|-------------|
| INC0010042 | Email server down | High | Open | John Smith |
| INC0010043 | VPN connectivity issues | Medium | In Progress | Jane Doe |

## Additional Resources

- **`references/servicenow-categories.md`** - Standard incident categories and subcategories
- **`references/servicenow-priorities.md`** - Priority matrix and escalation rules
