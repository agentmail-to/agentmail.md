---
name: agentmail
description: Use AgentMail CLI to give agents real email.
---

# AgentMail

AgentMail gives an agent its own email inbox. Use it when the agent needs to
send mail, receive replies, complete email OTP flows, or run an email loop from
an agent-owned address.

Use the `agentmail` CLI first. Use MCP only when the harness expects MCP tools,
and use REST only when the CLI is missing a required operation.

Hosted reference: [agentmail.md](https://agentmail.md).

## Start

```bash
npm install -g agentmail-cli
export AGENTMAIL_API_KEY="am_..."
agentmail inboxes list --format json
```

No API key yet? Start with [signup.md](signup.md).

## Files

- [signup.md](signup.md): create an AgentMail agent account and verify by OTP.
- [core.md](core.md): create inboxes, send, read, reply, forward, label, and
  handle attachments.
- [webhooks.md](webhooks.md): receive events on a public HTTPS server.
- [websockets.md](websockets.md): wait for events from a local agent process.
- [mcp.md](mcp.md): connect AgentMail through MCP when requested.

## Rules

- Use `--format json` whenever another command or script needs IDs.
- Prefer `AGENTMAIL_API_KEY` over `--api-key` so secrets stay out of shell
  history.
- Use stable `client_id` values for retried create operations.
- Prefer `extracted_text` or `extracted_html` for LLM input when present.
- Subscribe or react to `message.received` for inbound loops; do not process
  your own outbound lifecycle events as new work.
- Never send `AGENTMAIL_API_KEY` anywhere except AgentMail API or MCP endpoints.

## Verify

```bash
agentmail inboxes list --format json
```
