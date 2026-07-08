---
name: agentmail
description: Use AgentMail CLI to give agents real email inboxes.
---

# AgentMail

AgentMail gives an agent its own email inbox. Use it when the agent needs to
send mail, receive replies, complete email OTP flows, or run an email loop from
an agent-owned address. Use the `agentmail` CLI first.

Use MCP only when the harness expects MCP tools. Use REST only when the CLI is
missing a required operation.

Do not use AgentMail for a user's existing IMAP/SMTP mailbox; use a mailbox
client for that account instead.

## Start

```bash
npm install -g agentmail-cli@latest
export AGENTMAIL_API_KEY="am_..."
agentmail inboxes list --format json
```

No API key yet? Use [signup.md](signup.md).

## References

- [AgentMail agent reference](https://agentmail.md): hosted copy.
- [AgentMail](https://agentmail.to): product landing page.
- [Console](https://console.agentmail.to): API keys and account management.
- [Docs](https://docs.agentmail.to): full product documentation.
- [signup.md](signup.md): self-signup and OTP verification.
- [core.md](core.md): inboxes, messages, threads, labels, attachments.
- [webhooks.md](webhooks.md): events to a public HTTPS server.
- [websockets.md](websockets.md): events to a local agent process.
- [mcp.md](mcp.md): MCP integration.

## Rules

- Use `--format json` whenever another command or script needs IDs.
- Prefer `AGENTMAIL_API_KEY` over `--api-key`.
- Use stable `client_id` values for retried create operations.
- Prefer `extracted_text` or `extracted_html` for LLM input when present.
- React to `message.received`, not messages the agent sent.
- Never expose `AGENTMAIL_API_KEY` in prompts, logs, URLs, or committed files.

## Verify

```bash
agentmail inboxes list --format json
```
