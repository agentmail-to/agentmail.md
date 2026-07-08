---
name: agentmail
description: Use AgentMail CLI to give agents real email inboxes.
---

# AgentMail

## Overview

AgentMail gives an agent its own email inbox. Use it when the agent needs to
send mail, receive replies, complete email OTP flows, or run an email loop from
an agent-owned address.

Use the `agentmail` CLI first. Use MCP only when the harness expects MCP tools,
and use REST only when the CLI is missing a required operation.

## When to Use

- Use AgentMail for agent-owned inboxes, email verification flows, and automated
  inbound email handling.
- Use the CLI for normal work: signup, inboxes, messages, threads, labels, and
  attachments.
- Use [mcp.md](mcp.md) only when the agent harness already works through MCP.
- Use the full [Docs](https://docs.agentmail.to) when a task needs details not
  captured here.
- Do not use AgentMail for a user's existing IMAP/SMTP mailbox; use a mailbox
  client for that account instead.

## Prerequisites

```bash
npm install -g agentmail-cli
export AGENTMAIL_API_KEY="am_..."
agentmail inboxes list --format json
```

No API key yet? Start with [signup.md](signup.md).

## References

- [AgentMail agent reference](https://agentmail.md): hosted copy of these
  files.
- [AgentMail](https://agentmail.to): product landing page.
- [Console](https://console.agentmail.to): create human-managed API keys and
  manage the account.
- [Docs](https://docs.agentmail.to): full product documentation.
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
- Subscribe or react to `message.received` for inbound loops.
- Keep `AGENTMAIL_API_KEY` scoped to AgentMail API and MCP endpoints.

## Workflow

1. Install `agentmail-cli` and verify `agentmail --help` runs.
2. If no API key is available, complete [signup.md](signup.md); stop when
   verification succeeds and `agentmail inboxes list --format json` works.
3. Export `AGENTMAIL_API_KEY` in the current shell and confirm
   `agentmail inboxes list --format json` succeeds.
4. Use [core.md](core.md) for send/read/reply/forward flows.
5. Add [webhooks.md](webhooks.md) or [websockets.md](websockets.md) only when
   polling is not enough.

## Common Pitfalls

- Do not put `AGENTMAIL_API_KEY` in prompts, logs, URLs, or committed files.
- Do not retry message creation with new IDs; use stable `client_id` values.
- Do not feed quoted email history to the model when `extracted_text` or
  `extracted_html` is available.
- Do not trigger automations from messages the same agent sent.

## Verification Checklist

```bash
agentmail inboxes list --format json
```

- [ ] The CLI is installed and callable as `agentmail`.
- [ ] `AGENTMAIL_API_KEY` is set only in the execution environment.
- [ ] Self-signup accounts are OTP-verified before unrestricted sending.
- [ ] Realtime handlers filter for inbound `message.received` events.
