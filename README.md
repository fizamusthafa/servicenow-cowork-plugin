# ServiceNow plugin for Copilot Cowork and ITSM agent for Copilot Studio

One ServiceNow MCP server with two front ends:

- **[ITSM Assistant for Copilot Studio](copilot-studio/README.md):** a full ITSM agent built on the **GitHub Copilot harness**. It covers incidents, problems, changes, catalog requests, knowledge, the CMDB, and approvals, using 9 skills. Users sign in with their own ServiceNow account (OAuth), the server is hosted on Azure Container Apps, and the agent is published to Microsoft 365 Copilot and Teams. **Start at [copilot-studio/README.md](copilot-studio/README.md).**
- **Copilot Cowork plugin** (described below): Cowork can search, create, update, and resolve incidents and change requests through natural language, with approval prompts before any write operation.

![Cowork showing ServiceNow incidents in a table](https://img.shields.io/badge/Cowork-Frontier_Preview-blue) ![Node.js](https://img.shields.io/badge/Node.js-20+-green) ![License](https://img.shields.io/badge/license-MIT-lightgrey)

## What it does

Ask Cowork things like:

- "Show me all open incidents in ServiceNow"
- "Create a new incident: VPN not connecting for remote users"
- "Resolve incident INC0000046 — reinstalled the application"
- "Find all critical priority incidents assigned to Beth Anglin"
- "Show me pending change requests"

Cowork calls the MCP server, which translates the request into ServiceNow Table API calls and returns structured data. Write operations trigger an approval dialog before executing.

## Architecture

```
┌─────────────┐     JSON-RPC/HTTPS      ┌─────────────────┐     REST API      ┌──────────────────┐
│   Copilot    │ ───────────────────────>│   MCP Server    │ ──────────────── >│   ServiceNow     │
│   Cowork     │ <───────────────────────│   (Node.js)     │ <─────────────── │   Table API      │
└─────────────┘   tools/list, tools/call └─────────────────┘  GET/POST/PATCH  └──────────────────┘
```

The plugin package tells Cowork what the MCP server can do, through skills and tool descriptions. The MCP server handles the actual ServiceNow communication.

The server supports two authentication modes, set with `AUTH_MODE` in `mcp-server/.env`:

| `AUTH_MODE` | Credentials sent to ServiceNow | Use for |
|---|---|---|
| `basic` (default) | One service account (`SERVICENOW_USERNAME` / `SERVICENOW_PASSWORD`) | Local development, the Cowork demo |
| `oauth` | The caller's own OAuth bearer token, passed through unchanged; requests without one get a 401 | The Copilot Studio agent, and any shared deployment |

The server uses the official MCP SDK, over stateless Streamable HTTP at `POST /mcp`.

## Repository layout

```
├── plugin/                        # Cowork plugin package
│   ├── manifest.json              # M365 app manifest v1.28
│   ├── color.png                  # 192×192 ServiceNow icon
│   ├── outline.png                # 32×32 outline icon
│   ├── mcp-tools.json             # Tool descriptions for the connector
│   └── skills/
│       ├── servicenow-incidents/  # Incident management workflows
│       │   ├── SKILL.md
│       │   └── references/
│       │       ├── servicenow-categories.md
│       │       └── servicenow-priorities.md
│       └── servicenow-changes/    # Change request workflows
│           └── SKILL.md
├── copilot-studio/                # ITSM Assistant for Copilot Studio (GitHub Copilot harness)
│   ├── README.md                  # Setup: Azure → ServiceNow OAuth → agent → skills → M365 Copilot
│   ├── agent/                     # Instructions + agent profile
│   ├── skills/                    # 9 ITSM skills (SKILL.md + references)
│   ├── scripts/                   # validate-skills.js, package-skills.sh
│   └── tests/test-prompts.md      # End-to-end test script
├── mcp-server/                    # MCP server (Node.js, official MCP SDK)
│   ├── package.json
│   ├── Dockerfile
│   ├── .env.example
│   ├── src/
│   │   ├── server.js              # Entry point
│   │   ├── app.js                 # HTTP + auth (basic | oauth pass-through)
│   │   ├── mcp.js                 # MCP server, argument validation
│   │   ├── servicenow.js          # ServiceNow REST client + query sanitising
│   │   └── tools/                 # incidents, changes, problems, requests, knowledge, cmdb, people, records
│   └── test/                      # npm test
├── infra/                         # Bicep for Azure Container Apps (used by azd)
├── azure.yaml                     # azd project
└── SETUP.md                       # Full walkthrough (dev instance → Cowork)
```

## Quick start

### 1. Start the MCP server

```bash
cd mcp-server
cp .env.example .env
# Edit .env with your ServiceNow instance URL, username, and password
npm install
npm start
```

### 2. Expose it publicly

Cowork needs an HTTPS endpoint. Use a dev tunnel:

```bash
devtunnel host -p 3001 --allow-anonymous
```

### 3. Update the manifest

Set `mcpServerUrl` in `plugin/manifest.json` to your tunnel URL:

```json
"mcpServerUrl": "https://your-tunnel-url/mcp"
```

### 4. Package and sideload

```bash
cd plugin
# Windows
Compress-Archive -Path manifest.json, color.png, outline.png, skills, mcp-tools.json -DestinationPath ..\sn-plugin.zip -Force
# macOS/Linux
zip -r ../sn-plugin.zip manifest.json color.png outline.png skills/ mcp-tools.json

atk install --file-path ../sn-plugin.zip
```

### 5. Open Cowork

Go to https://m365.cloud.microsoft/chat → All agents → Cowork (Frontier). The ServiceNow plugin should appear in Sources & Skills.

## MCP tools

| Tool | Method | What it does |
|------|--------|-------------|
| `search_incidents` | GET | Search by state, priority, assignee, or keyword |
| `get_incident` | GET | Full details of one incident by number |
| `create_incident` | POST | Create a new incident |
| `update_incident` | PATCH | Update fields, add work notes |
| `resolve_incident` | PATCH | Resolve with close notes |
| `search_changes` | GET | Search change requests |
| `get_change` | GET | Full details of a change request |
| `create_change` | POST | Create a new change request |

The Cowork plugin uses the tools above. The server also exposes the full ITSM set used by the Copilot Studio agent:
- Problems, plus linking an incident to a problem
- Catalog search and ordering, and requested items (RITMs)
- Knowledge articles
- CMDB configuration items
- Users and groups
- Work notes and record activity
- Approvals
- Change updates

See [copilot-studio/README.md](copilot-studio/README.md#what-the-agent-can-do).

Run the tests with `cd mcp-server && npm test`.

## ServiceNow developer instance

If you don't have a ServiceNow instance, you can get a free Personal Developer Instance (PDI) at [developer.servicenow.com](https://developer.servicenow.com). PDIs come with sample data and admin access. See [SETUP.md](SETUP.md) for a step-by-step walkthrough.

## Prerequisites

- Node.js 20+
- An M365 tenant with Copilot and [Frontier preview](https://adoption.microsoft.com/en-us/copilot/frontier-program/) enabled
- [M365 Agents Toolkit](https://marketplace.visualstudio.com/items?itemName=TeamsDevApp.ms-teams-vscode-extension) VS Code extension (provides the `atk` CLI)
- A ServiceNow instance (free dev instance works)

## How the plugin package works

A Cowork plugin is a zip file containing:

- **manifest.json** — M365 Unified App Manifest (v1.28) declaring the app identity, skills, and connectors
- **Skills** — SKILL.md files following the [Agent Skills open standard](https://learn.microsoft.com/en-us/microsoft-365/copilot/cowork/cowork-plugin-development#cross-platform-compatibility). These teach Cowork when and how to handle ServiceNow requests. The same SKILL.md files work in Claude Code, VS Code Copilot, Gemini CLI, and other tools.
- **Connector** — points Cowork to the remote MCP server. Cowork discovers tools via `tools/list` and invokes them via `tools/call` (JSON-RPC 2.0 over HTTPS).

Write operations (`create_incident`, `update_incident`, `resolve_incident`, `create_change`) are annotated with `destructiveHint: true`, which makes Cowork show an approval dialog before executing.

## License

MIT
