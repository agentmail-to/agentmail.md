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

## How to Run

CLI commands follow this pattern:

```bash
agentmail [resource] <command> [flags...]
agentmail inboxes:messages send --inbox-id agent@agentmail.to --to user@example.com --subject "Hello" --text "Hi"
```

Use `--format json` whenever another command or script needs IDs from the
output. Use `agentmail <resource> <command> --help` before guessing flags.

## Quick Start

If there is no API key, sign up and verify first:

```bash
agentmail agent sign-up \
  --human-email you@example.com \
  --username my-agent \
  --source agentmail-cli \
  --referrer agentmail.md \
  --format json

export AGENTMAIL_API_KEY="am_..."
agentmail agent verify --otp-code 123456
```

Then create or reuse an inbox:

```bash
agentmail inboxes create \
  --username support \
  --display-name "Support Agent" \
  --client-id support-agent-primary \
  --format json
```

Send mail:

```bash
agentmail inboxes:messages send \
  --inbox-id support@agentmail.to \
  --to customer@example.com \
  --subject "Hello" \
  --text "Plain-text body." \
  --html "<p>Plain-text body.</p>" \
  --label outreach \
  --format json
```

Read and reply:

```bash
agentmail inboxes:messages list --inbox-id support@agentmail.to --label unread --format json
agentmail inboxes:messages retrieve --inbox-id support@agentmail.to --message-id <message_id> --format json
agentmail inboxes:threads retrieve --inbox-id support@agentmail.to --thread-id <thread_id> --format json
agentmail inboxes:messages reply --inbox-id support@agentmail.to --message-id <message_id> --text "Thanks." --format json
agentmail inboxes:messages update --inbox-id support@agentmail.to --message-id <message_id> --add-label handled --remove-label unread
```

## Reference Files

- [signup.md](signup.md): self-signup, OTP verification, and restricted mode.
- [cli.md](cli.md): inbox, message, thread, label, attachment, reply, and
  forward workflows.
- [realtime.md](realtime.md): when to use webhooks or WebSockets, plus loop
  prevention rules.
- [fallbacks.md](fallbacks.md): REST fallback, MCP alternative, errors, limits,
  idempotency, and rate-limit behavior.

Read only the files needed for the task. The CLI is the default path even when
REST and MCP are available.

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
agentmail inboxes create --username agentmail-smoke --client-id agentmail-smoke --format json
```

If the second command returns an inbox instead of an auth error, the CLI and API
key work.
