# ITSM Assistant: agent profile

Use these values when you create the agent in Copilot Studio.

| Setting | Value |
|---|---|
| **Harness** | GitHub Copilot harness. This is the default for new agents in Copilot Studio. Don't pick the standard harness, because it has no skills. |
| **Name** | ITSM Assistant |
| **Description** | Raises, triages, and tracks ServiceNow incidents, problems, changes, and requests. Searches knowledge and handles approvals as the signed-in user. |
| **Instructions** | [`instructions.md`](instructions.md) |
| **Model** | Use a reasoning-capable model from the model picker. Triage, major incidents, and change risk reviews are multi-step. Avoid "mini" or "flash" models. |
| **Tools** | One MCP server tool, **ServiceNow ITSM**, pointing at `https://<your-container-app>/mcp`, with OAuth 2.0. See [`../README.md`](../README.md#4-add-the-mcp-server-as-a-tool). |
| **Skills** | Everything under [`../skills`](../skills). Upload the zips from `copilot-studio/dist/`. |
| **Knowledge** | Optional: a SharePoint site with internal runbooks. ServiceNow KB articles come from the `search_knowledge` tool, so don't add the ServiceNow KB as a separate knowledge source. |
| **Memory** | Keep it limited to the user's preferred assignment group, the services they own or follow, and their preferred output format. Never store ticket contents, credentials, or personal data. |
| **Channels** | Test in the **Preview** pane, then publish to **Microsoft 365 Copilot and Teams**. |

## Suggested conversation starters

| Title | Prompt |
|---|---|
| My open work | What's on my plate in ServiceNow today? |
| Report an issue | I need to report an issue: VPN keeps disconnecting every few minutes |
| Critical incidents | Show me all open P1 and P2 incidents |
| Change review | Review CHG0000001 for risk and conflicts before CAB |
| Request something | I need to request a new laptop |
| Approvals | What approvals are waiting on me? |
