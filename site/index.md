# AgentMail Agent Reference

This site hosts markdown reference files for agents using AgentMail. The goal is
to give coding agents the minimum operational context needed to install the
`agentmail` CLI, create or use an inbox, send and receive mail, and choose
realtime delivery only when needed.

## Skills

- **[signup](https://agentmail.md/signup)**: self-sign up for an AgentMail API
  key, verify by OTP, and unlock the agent inbox.
- **[core](https://agentmail.md/core)**: create inboxes and send, receive, reply
  to, forward, thread, label, and attach email with the CLI.
- **[webhooks](https://agentmail.md/webhooks)**: receive email events by push to
  a public HTTPS URL and avoid webhook processing loops.
- **[websockets](https://agentmail.md/websockets)**: stream email events to a
  local agent process without a public URL.

New here with no API key? Start with **[signup](https://agentmail.md/signup)**.
Otherwise start with **[core](https://agentmail.md/core)**.

## Canonical Skill Package

- [SKILL.md](https://agentmail.md/SKILL.md): CLI-first AgentMail skill entry
  point.
- [signup.md](https://agentmail.md/signup.md): self-signup and OTP verification.
- [cli.md](https://agentmail.md/cli.md): inboxes, messages, threads, replies,
  labels, and attachments.
- [realtime.md](https://agentmail.md/realtime.md): webhooks and WebSockets.
- [fallbacks.md](https://agentmail.md/fallbacks.md): REST fallback, MCP
  alternative, errors, limits, and idempotency.

## Machine-readable Index

- [llms.txt](https://agentmail.md/llms.txt)
- [llms-full.txt](https://agentmail.md/llms-full.txt)
