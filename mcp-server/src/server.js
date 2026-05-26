require("dotenv").config();
const express = require("express");

const app = express();
app.use(express.json());

// ── ServiceNow connection config ────────────────────────────────────
const SN_INSTANCE = process.env.SERVICENOW_INSTANCE; // e.g. https://dev12345.service-now.com
const SN_USER = process.env.SERVICENOW_USERNAME;
const SN_PASS = process.env.SERVICENOW_PASSWORD;

if (!SN_INSTANCE || !SN_USER || !SN_PASS) {
  console.error("WARNING: Missing SERVICENOW_INSTANCE, SERVICENOW_USERNAME, or SERVICENOW_PASSWORD");
  console.error("ENV vars present:", { SN_INSTANCE: !!SN_INSTANCE, SN_USER: !!SN_USER, SN_PASS: !!SN_PASS });
}

const AUTH_HEADER = "Basic " + Buffer.from(`${SN_USER}:${SN_PASS}`).toString("base64");

// ── ServiceNow Table API helper ─────────────────────────────────────
async function snRequest(method, path, body) {
  const url = `${SN_INSTANCE}/api/now/${path}`;
  const opts = {
    method,
    headers: {
      Authorization: AUTH_HEADER,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ServiceNow API ${res.status}: ${text}`);
  }
  return res.json();
}

// ── MCP Tool definitions ────────────────────────────────────────────
const tools = [
  {
    name: "search_incidents",
    description:
      "Search ServiceNow incidents by status, priority, assignee, or keyword. Returns up to 20 results.",
    annotations: { readOnlyHint: true, title: "Search Incidents" },
    inputSchema: {
      type: "object",
      properties: {
        state: {
          type: "string",
          description: "Filter by state number: 1=New, 2=In Progress, 3=On Hold, 6=Resolved, 7=Closed",
        },
        priority: {
          type: "string",
          description: "Filter by priority: 1 (Critical) through 5 (Planning)",
        },
        assigned_to: {
          type: "string",
          description: "Filter by assignee display name (contains match)",
        },
        query: {
          type: "string",
          description: "Free-text search in short_description",
        },
      },
    },
  },
  {
    name: "get_incident",
    description:
      "Get full details of a single ServiceNow incident by its number (e.g. INC0010001).",
    annotations: { readOnlyHint: true, title: "Get Incident" },
    inputSchema: {
      type: "object",
      properties: {
        number: { type: "string", description: "Incident number, e.g. INC0010001" },
      },
      required: ["number"],
    },
  },
  {
    name: "create_incident",
    description: "Create a new incident in ServiceNow.",
    annotations: { destructiveHint: true, title: "Create Incident" },
    inputSchema: {
      type: "object",
      properties: {
        short_description: { type: "string", description: "Brief summary" },
        description: { type: "string", description: "Full details" },
        category: { type: "string", description: "Category: hardware, software, network, inquiry, database" },
        urgency: { type: "string", description: "1 (High), 2 (Medium), 3 (Low)" },
        impact: { type: "string", description: "1 (High), 2 (Medium), 3 (Low)" },
        assignment_group: { type: "string", description: "Assignment group display name" },
        caller_id: { type: "string", description: "Caller user name or sys_id" },
      },
      required: ["short_description"],
    },
  },
  {
    name: "update_incident",
    description: "Update fields on an existing ServiceNow incident.",
    annotations: { destructiveHint: true, title: "Update Incident" },
    inputSchema: {
      type: "object",
      properties: {
        number: { type: "string", description: "Incident number" },
        assigned_to: { type: "string", description: "New assignee sys_id or name" },
        priority: { type: "string", description: "New priority (1-5)" },
        state: { type: "string", description: "New state number (1-7)" },
        work_notes: { type: "string", description: "Add a work note" },
        comments: { type: "string", description: "Add a customer-visible comment" },
      },
      required: ["number"],
    },
  },
  {
    name: "resolve_incident",
    description: "Resolve a ServiceNow incident with close notes.",
    annotations: { destructiveHint: true, title: "Resolve Incident" },
    inputSchema: {
      type: "object",
      properties: {
        number: { type: "string", description: "Incident number" },
        close_notes: { type: "string", description: "Resolution / close notes" },
        close_code: {
          type: "string",
          description: "Solved (Permanently), Solved (Work Around), Not Solved, Closed/Resolved by Caller",
        },
      },
      required: ["number", "close_notes"],
    },
  },
  {
    name: "search_changes",
    description: "Search ServiceNow change requests.",
    annotations: { readOnlyHint: true, title: "Search Changes" },
    inputSchema: {
      type: "object",
      properties: {
        state: {
          type: "string",
          description: "State number: -5=New, -4=Assess, -3=Authorize, -2=Scheduled, -1=Implement, 0=Review, 3=Closed",
        },
        type: { type: "string", description: "normal, standard, or emergency" },
        assignment_group: { type: "string", description: "Filter by assignment group name" },
      },
    },
  },
  {
    name: "get_change",
    description: "Get full details of a change request by its number.",
    annotations: { readOnlyHint: true, title: "Get Change Request" },
    inputSchema: {
      type: "object",
      properties: {
        number: { type: "string", description: "Change number, e.g. CHG0000001" },
      },
      required: ["number"],
    },
  },
  {
    name: "create_change",
    description: "Create a new change request in ServiceNow.",
    annotations: { destructiveHint: true, title: "Create Change Request" },
    inputSchema: {
      type: "object",
      properties: {
        short_description: { type: "string", description: "Brief summary" },
        description: { type: "string", description: "Full details and justification" },
        type: { type: "string", description: "normal, standard, or emergency" },
        risk: { type: "string", description: "high, moderate, low" },
        impact: { type: "string", description: "1 (High), 2 (Medium), 3 (Low)" },
        assignment_group: { type: "string", description: "Assignment group" },
        start_date: { type: "string", description: "Planned start (ISO 8601)" },
        end_date: { type: "string", description: "Planned end (ISO 8601)" },
      },
      required: ["short_description", "type"],
    },
  },
];

// ── Tool handler — calls real ServiceNow Table API ──────────────────
async function handleTool(name, args) {
  switch (name) {
    case "search_incidents": {
      const parts = [];
      if (args.state) parts.push(`state=${args.state}`);
      if (args.priority) parts.push(`priority=${args.priority}`);
      if (args.assigned_to) parts.push(`assigned_to.display_nameLIKE${args.assigned_to}`);
      if (args.query) parts.push(`short_descriptionLIKE${args.query}`);
      const query = parts.join("^") || "ORDERBYDESCsys_created_on";
      const fields = "number,short_description,priority,state,assigned_to,assignment_group,opened_at,category";
      const data = await snRequest(
        "GET",
        `table/incident?sysparm_query=${encodeURIComponent(query)}&sysparm_fields=${fields}&sysparm_limit=20&sysparm_display_value=true`
      );
      return data.result;
    }

    case "get_incident": {
      const data = await snRequest(
        "GET",
        `table/incident?sysparm_query=number=${encodeURIComponent(args.number)}&sysparm_limit=1&sysparm_display_value=true`
      );
      if (!data.result || data.result.length === 0)
        return { error: `Incident ${args.number} not found` };
      return data.result[0];
    }

    case "create_incident": {
      const body = { short_description: args.short_description };
      if (args.description) body.description = args.description;
      if (args.category) body.category = args.category;
      if (args.urgency) body.urgency = args.urgency;
      if (args.impact) body.impact = args.impact;
      if (args.assignment_group) body.assignment_group = args.assignment_group;
      if (args.caller_id) body.caller_id = args.caller_id;
      const data = await snRequest("POST", "table/incident", body);
      return {
        number: data.result.number,
        sys_id: data.result.sys_id,
        state: data.result.state,
        message: `Incident ${data.result.number} created successfully`,
      };
    }

    case "update_incident": {
      const lookup = await snRequest(
        "GET",
        `table/incident?sysparm_query=number=${encodeURIComponent(args.number)}&sysparm_fields=sys_id&sysparm_limit=1`
      );
      if (!lookup.result || lookup.result.length === 0)
        return { error: `Incident ${args.number} not found` };
      const sysId = lookup.result[0].sys_id;
      const body = {};
      if (args.assigned_to) body.assigned_to = args.assigned_to;
      if (args.priority) body.priority = args.priority;
      if (args.state) body.state = args.state;
      if (args.work_notes) body.work_notes = args.work_notes;
      if (args.comments) body.comments = args.comments;
      const data = await snRequest("PATCH", `table/incident/${sysId}`, body);
      return {
        number: data.result.number,
        message: `Incident ${args.number} updated`,
        updated_fields: Object.keys(body),
      };
    }

    case "resolve_incident": {
      const lookup = await snRequest(
        "GET",
        `table/incident?sysparm_query=number=${encodeURIComponent(args.number)}&sysparm_fields=sys_id&sysparm_limit=1`
      );
      if (!lookup.result || lookup.result.length === 0)
        return { error: `Incident ${args.number} not found` };
      const sysId = lookup.result[0].sys_id;
      const data = await snRequest("PATCH", `table/incident/${sysId}`, {
        state: "6",
        close_notes: args.close_notes,
        close_code: args.close_code || "Solved (Permanently)",
      });
      return {
        number: data.result.number,
        state: "Resolved",
        message: `Incident ${args.number} resolved`,
      };
    }

    case "search_changes": {
      const parts = [];
      if (args.state) parts.push(`state=${args.state}`);
      if (args.type) parts.push(`type=${args.type}`);
      if (args.assignment_group) parts.push(`assignment_group.display_nameLIKE${args.assignment_group}`);
      const query = parts.join("^") || "ORDERBYDESCsys_created_on";
      const fields = "number,short_description,type,risk,state,start_date,end_date,assigned_to,assignment_group";
      const data = await snRequest(
        "GET",
        `table/change_request?sysparm_query=${encodeURIComponent(query)}&sysparm_fields=${fields}&sysparm_limit=20&sysparm_display_value=true`
      );
      return data.result;
    }

    case "get_change": {
      const data = await snRequest(
        "GET",
        `table/change_request?sysparm_query=number=${encodeURIComponent(args.number)}&sysparm_limit=1&sysparm_display_value=true`
      );
      if (!data.result || data.result.length === 0)
        return { error: `Change ${args.number} not found` };
      return data.result[0];
    }

    case "create_change": {
      const body = { short_description: args.short_description, type: args.type };
      if (args.description) body.description = args.description;
      if (args.risk) body.risk = args.risk;
      if (args.impact) body.impact = args.impact;
      if (args.assignment_group) body.assignment_group = args.assignment_group;
      if (args.start_date) body.start_date = args.start_date;
      if (args.end_date) body.end_date = args.end_date;
      const data = await snRequest("POST", "table/change_request", body);
      return {
        number: data.result.number,
        sys_id: data.result.sys_id,
        state: data.result.state,
        message: `Change ${data.result.number} created successfully`,
      };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ── MCP Streamable HTTP endpoint ────────────────────────────────────
app.post("/mcp", async (req, res) => {
  const { method, params, id } = req.body;

  switch (method) {
    case "initialize":
      return res.json({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2025-03-26",
          capabilities: { tools: {} },
          serverInfo: { name: "servicenow-mcp-server", version: "1.0.0" },
        },
      });

    case "tools/list":
      return res.json({ jsonrpc: "2.0", id, result: { tools } });

    case "tools/call": {
      try {
        const { name, arguments: args } = params;
        const result = await handleTool(name, args || {});
        return res.json({
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          },
        });
      } catch (err) {
        return res.json({
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: JSON.stringify({ error: err.message }) }],
            isError: true,
          },
        });
      }
    }

    default:
      return res.status(400).json({
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Method not found: ${method}` },
      });
  }
});

// Health check — validates ServiceNow connectivity
app.get("/health", async (_req, res) => {
  try {
    await snRequest("GET", "table/incident?sysparm_limit=1&sysparm_fields=number");
    res.json({ status: "ok", servicenow: "connected", instance: SN_INSTANCE });
  } catch (err) {
    res.status(503).json({ status: "error", message: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`ServiceNow MCP server running on port ${PORT}`);
  console.log(`Connected to: ${SN_INSTANCE}`);
  console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
