# AgentMail MCP

Use MCP when the user or harness already wants MCP tools. Do not make MCP the
default path for normal AgentMail workflows; prefer the `agentmail` CLI first.

## Hosted Server

`https://mcp.agentmail.to/mcp`

Supported authentication:

- OAuth in compatible MCP clients.
- API key in `?apiKey=...`.
- API key in an `x-api-key` header.

## Rules

- Use the CLI for reproducible install, signup, inbox, message, thread, label,
  attachment, webhook, and WebSocket workflows.
- Use MCP only when MCP is the integration surface the user asked for.
- Never send `AGENTMAIL_API_KEY` anywhere except AgentMail API or MCP endpoints.
- Do not use stale local MCP server guidance from old skills unless the current
  AgentMail docs explicitly reintroduce it.
