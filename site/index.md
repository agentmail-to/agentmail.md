# AgentMail Agent Reference

This site hosts markdown reference files for agents using AgentMail. The goal is
to give coding agents the minimum operational context needed to install the
`agentmail` CLI, create or use an inbox, send and receive mail, and choose
realtime delivery only when needed.

## Skills

- **[signup](signup.md)**: self-sign up for an AgentMail API key, verify by OTP,
  and unlock the agent inbox.
- **[core](core.md)**: create inboxes and send, receive, reply to, forward,
  thread, label, and attach email with the CLI.
- **[webhooks](webhooks.md)**: receive email events by push to a public HTTPS
  URL and avoid webhook processing loops.
- **[websockets](websockets.md)**: stream email events to a local agent process
  without a public URL.

New here with no API key? Start with **[signup](signup.md)**. Otherwise start
with **[core](core.md)**.

## Canonical Skill Package

- [SKILL.md](SKILL.md): CLI-first AgentMail skill entry point.
- [signup.md](signup.md): self-signup and OTP verification.
- [cli.md](cli.md): inboxes, messages, threads, replies, labels, and attachments.
- [realtime.md](realtime.md): webhooks and WebSockets.
- [fallbacks.md](fallbacks.md): REST fallback, MCP alternative, errors, limits,
  and idempotency.

## Machine-readable Index

- [llms.txt](llms.txt)
- [llms-full.txt](llms-full.txt)

The authored skill package lives in `agentmail/` in the repository, but hosted
links are intentionally sibling links with no package prefix so they work both
on `https://agentmail.md/` and in exported skill folders.
