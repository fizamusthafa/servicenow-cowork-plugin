---
name: servicenow-changes
description: |
  Manages ServiceNow change requests - create, review, approve, and track changes.
  Use when user asks to "create a change request", "submit a change",
  "check change status", "approve a change", "review change requests",
  "schedule a maintenance window", "list pending changes",
  "find my change requests", or "track change implementation".
license: MIT
metadata:
  author: Contoso IT
  version: "1.0"
---

# ServiceNow Change Management

## What This Skill Does

Enables Cowork to manage ServiceNow change requests, including:
- Creating new change requests (Normal, Standard, Emergency)
- Reviewing and approving changes in the pipeline
- Tracking change implementation status
- Querying changes by date, status, or assignment group

## Workflow

### Creating a Change Request
1. Determine change type from user context (Normal, Standard, Emergency)
2. Gather: short description, justification, risk assessment, planned dates
3. Use the `create_change` tool to submit the change request
4. Return the change number and approval status

### Reviewing Changes
1. Use the `search_changes` tool to find pending changes
2. Present the change details including risk and impact assessment
3. If user wants to approve, use the `approve_change` tool

### Tracking Changes
1. Use the `get_change` tool to retrieve change details
2. Present current state, scheduled dates, and implementation notes

## Output Format

| Field | Value |
|-------|-------|
| Number | CHG0001234 |
| Type | Normal |
| Short Description | Upgrade Exchange Server to latest CU |
| Risk | Moderate |
| State | Assess |
| Planned Start | 2026-06-15 02:00:00 |
| Planned End | 2026-06-15 06:00:00 |
