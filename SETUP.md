# Building a ServiceNow plugin for Copilot Cowork

This guide walks through connecting a ServiceNow instance to Microsoft 365 Copilot Cowork via an MCP server. By the end, Cowork can search, create, update, and resolve ServiceNow incidents and change requests through natural language.

The setup has two independent parts. If you already have a ServiceNow instance, skip straight to Part 2.

---

## Part 1: Getting a ServiceNow developer instance

ServiceNow offers free Personal Developer Instances (PDIs) at [developer.servicenow.com](https://developer.servicenow.com). They come pre-loaded with sample data — incidents, users, change requests — which makes them ideal for demos.

### Create your account

1. Go to https://developer.servicenow.com and click **Sign In**
2. Click **Get a ServiceNow ID** and fill out the registration form
3. Check your email for a verification link and confirm your account
4. Log in (ServiceNow will send an MFA code to your email on first login)

### Request an instance

1. From the developer dashboard, click **Request Instance** in the top-right
2. Pick the **Australia** release (latest) and click **Request**
3. Provisioning takes about a minute

Once ready, you'll see your instance details:

| Field | Where to find it |
|-------|-----------------|
| Instance URL | Dashboard → My Instance (e.g. `https://dev290248.service-now.com`) |
| Username | Always `admin` for PDIs |
| Password | Click the eye icon next to "Current password" on the dashboard |

### Switch to admin role

1. Click your profile → **Change User Role**
2. Select **Admin** → confirm

You need admin access to create incidents and configure the instance for the demo.

### Things to know about PDIs

- They hibernate after a period of inactivity. Wake yours by visiting the URL in a browser before starting a demo.
- Instances dormant for 10+ days get reclaimed by ServiceNow. You can request a new one if that happens.
- The instance comes with ~50 sample incidents across different priorities and categories. You can modify these or create new ones through the ServiceNow UI at **All → Service Desk → Incidents**.

---

## Part 2: Bringing ServiceNow into Copilot Cowork

This part covers the MCP server, the Cowork plugin package, and sideloading.

### What you need

- Node.js 20+
- A ServiceNow instance (from Part 1 or your own)
- An M365 tenant with Copilot and Frontier preview enabled
- The [M365 Agents Toolkit](https://marketplace.visualstudio.com/items?itemName=TeamsDevApp.ms-teams-vscode-extension) VS Code extension (provides the `atk` CLI)

### 2.1 Configure and start the MCP server

The MCP server sits between Cowork and ServiceNow. It receives JSON-RPC tool calls from Cowork and translates them into ServiceNow Table API requests.

```
cd mcp-server
cp .env.example .env
```

Open `.env` and fill in your ServiceNow credentials:

```
SERVICENOW_INSTANCE=https://dev290248.service-now.com
SERVICENOW_USERNAME=admin
SERVICENOW_PASSWORD=your-password-here
PORT=3001
```

Install dependencies and start:

```
npm install
npm start
```

The server prints its endpoints on startup:

```
ServiceNow MCP server running on port 3001
Connected to: https://dev290248.service-now.com
MCP endpoint: http://localhost:3001/mcp
Health check: http://localhost:3001/health
```

Hit the health endpoint to confirm the ServiceNow connection works:

```powershell
Invoke-RestMethod http://localhost:3001/health
```

You should get back `{ status: "ok", servicenow: "connected" }`. If you see an error about credentials, double-check `.env` and make sure the instance isn't hibernating.

### 2.2 Expose the server with a dev tunnel

Cowork runs in the cloud and needs a public HTTPS URL to reach your local MCP server. Dev tunnels handle this:

```powershell
devtunnel host -p 3001 --allow-anonymous
```

Copy the tunnel URL from the output (looks like `https://xxxxx-3001.eun1.devtunnels.ms`). Verify it works:

```powershell
Invoke-RestMethod https://xxxxx-3001.eun1.devtunnels.ms/health
```

### 2.3 Set the tunnel URL in the manifest

Open `plugin/manifest.json` and replace the `mcpServerUrl` with your tunnel URL:

```json
"mcpServerUrl": "https://xxxxx-3001.eun1.devtunnels.ms/mcp"
```

### 2.4 Package and sideload

Build the zip:

```powershell
cd plugin
Compress-Archive -Path manifest.json, color.png, outline.png, skills, mcp-tools.json -DestinationPath ..\sn-plugin.zip -Force
```

Sideload with the Agents Toolkit CLI:

```powershell
atk install --file-path ..\sn-plugin.zip
```

This prints a `TitleId` and `AppId` on success. The plugin needs a few minutes to propagate through the M365 backend.

### 2.5 Test in Cowork

1. Open https://m365.cloud.microsoft/chat
2. Click **All agents** in the sidebar and select **Cowork (Frontier)**
3. Check that **ServiceNow for Cowork** appears in Sources & Skills with the toggle on
4. Send a prompt

#### Reading data

Try: `Show me all open incidents in ServiceNow`

Cowork calls the `search_incidents` tool on your MCP server, which queries ServiceNow's Table API and returns real incident data in a table.

#### Creating data

Try: `Create a new incident: "VPN not connecting for remote users" with category Network, urgency High`

Cowork shows a **Tool Approval** dialog before executing write operations. Click **Approve** and the incident gets created in your ServiceNow instance. You can verify it by logging into ServiceNow directly.

#### Other prompts to try

- `Get details for incident INC0000055`
- `Find all critical priority incidents assigned to Beth Anglin`
- `Resolve incident INC0000046 with close notes "Reinstalled SFA application"`
- `Create a normal change request: "Upgrade firewall firmware to v12.3"`
- `Show me all pending change requests`

---

## How it works

The plugin package contains two things:

**Skills** — SKILL.md files that teach Cowork the workflows for incident and change management. These are prompt-based instructions that tell Cowork when to activate (trigger phrases), what steps to follow, and how to format output. Skills follow the [Agent Skills open standard](https://learn.microsoft.com/en-us/microsoft-365/copilot/cowork/cowork-plugin-development#cross-platform-compatibility) and work across Cowork, Claude Code, VS Code Copilot, and other tools.

**Connector** — a pointer to the remote MCP server. The manifest declares the server URL and a tool description file (`mcp-tools.json`) listing the available tools. Cowork discovers tools via `tools/list` and invokes them via `tools/call` using JSON-RPC over HTTPS.

The MCP server translates tool calls into ServiceNow REST API requests:

```
Cowork → MCP Server (tools/call: search_incidents) → ServiceNow Table API (GET /api/now/table/incident)
```

Write operations (`create_incident`, `update_incident`, `resolve_incident`) map to POST and PATCH requests. Cowork prompts for user approval before executing these.

---

## Project layout

```
servicenow-cowork-plugin/
├── plugin/
│   ├── manifest.json          # M365 app manifest v1.28
│   ├── color.png              # 192×192 ServiceNow icon
│   ├── outline.png            # 32×32 outline icon
│   ├── mcp-tools.json         # Tool descriptions for the connector
│   └── skills/
│       ├── servicenow-incidents/
│       │   ├── SKILL.md
│       │   └── references/
│       └── servicenow-changes/
│           └── SKILL.md
├── mcp-server/
│   ├── package.json
│   ├── .env.example
│   └── src/
│       └── server.js          # Express server → ServiceNow Table API
└── SETUP.md                   # This file
```

## Available tools

| Tool | Operation | Description |
|------|-----------|-------------|
| search_incidents | GET | Search by state, priority, assignee, or keyword |
| get_incident | GET | Full details of a single incident |
| create_incident | POST | Create a new incident |
| update_incident | PATCH | Update fields on an existing incident |
| resolve_incident | PATCH | Set state to Resolved with close notes |
| search_changes | GET | Search change requests |
| get_change | GET | Full details of a change request |
| create_change | POST | Create a new change request |
