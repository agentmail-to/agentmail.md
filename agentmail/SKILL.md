---
name: agentmail
description: Use AgentMail CLI to give agents real email.
---

# AgentMail

AgentMail gives an agent its own email inbox. Use it when the agent needs a real
email address, must send or receive mail, needs to complete email OTP or signup
flows, or has to run an email conversation loop.

Use the `agentmail` CLI first. Use REST only as a fallback for a missing CLI
capability, and use MCP only when the surrounding harness already expects MCP
tools.

## When to Use

- The agent needs an address like `my-agent@agentmail.to`.
- The agent must email a human or service from its own identity.
- The agent must read, search, reply to, forward, label, or thread email.
- The agent is waiting for an email OTP, confirmation link, or signup message.
- A backend or worker needs webhook or WebSocket delivery for incoming mail.

Do not use AgentMail to read the user's personal Gmail, Outlook, or IMAP inbox.
AgentMail creates and controls agent-owned inboxes.

## Prerequisites

Install the CLI:

```bash
npm install -g agentmail-cli
agentmail --help
```

Authenticate one of two ways:

- No API key yet: use the self-signup flow in [signup.md](signup.md).
- Existing key: export it before running CLI commands.

```bash
export AGENTMAIL_API_KEY="am_..."
agentmail inboxes list --format json
```

Prefer `AGENTMAIL_API_KEY` over `--api-key` so secrets stay out of shell
history.

## Choose a Guide

- [signup.md](signup.md): get an API key and inbox with CLI self-signup.
- [core.md](core.md): create inboxes, send mail, read messages, handle threads,
  reply, forward, label, and work with attachments.
- [webhooks.md](webhooks.md): receive AgentMail events on a public HTTPS server.
- [websockets.md](websockets.md): wait for realtime inbound mail from a local
  agent process.
- [fallbacks.md](fallbacks.md): use REST or MCP only when the CLI is not enough.

Use `--format json` whenever another command or script needs IDs from CLI
output. Use `agentmail <resource> <command> --help` before guessing flags.

## Pitfalls

- Self-signup is idempotent by `human_email`, but signing up again with the
  same email rotates the API key. Store the first returned key.
- Until OTP verification, an agent organization has one inbox, a 10-send/day
  restricted mode, and can only send to the signup human email.
- Use stable `client_id` values for retried create operations such as inboxes
  and webhooks.
- Replies and sends are capped at 50 total recipients across `to`, `cc`, and
  `bcc`.
- For LLM input, prefer `extracted_text` or `extracted_html` over quoted full
  bodies when those fields exist.
- Incoming mail can have `html` without `text`; treat `html` as available and
  `text` as optional.
- Auto-reply loops should act only on `message.received`, not on
  `message.sent`, `message.delivered`, or other outbound lifecycle events.
- Never send `AGENTMAIL_API_KEY` anywhere except AgentMail API or MCP
  endpoints.

## Verification

```bash
agentmail inboxes list --format json
```

If that returns inboxes instead of an auth error, the CLI and API key work.
