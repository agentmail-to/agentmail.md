# AgentMail MCP

Use MCP only when the user or harness already wants MCP tools. The CLI remains
the default path for AgentMail workflows.

Hosted server:

```text
https://mcp.agentmail.to/mcp
```

Authentication:

- OAuth in compatible MCP clients (preferred).
- API key in an `x-api-key` header when OAuth is unavailable.

Never pass the API key as a URL query parameter.
