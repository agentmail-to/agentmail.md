# AgentMail Agent Reference

This site hosts markdown reference files for agents using AgentMail. The goal is
to give coding agents the minimum operational context needed to install the
`agentmail` CLI, create or use an inbox, send and receive mail, and choose
realtime delivery only when needed.

Start with the skill entry point:

- [SKILL.md](SKILL.md): CLI-first AgentMail skill for agents.

Then read only the support file needed for the task:

- [signup.md](signup.md): self-signup and OTP verification.
- [cli.md](cli.md): inboxes, messages, threads, replies, labels, and attachments.
- [realtime.md](realtime.md): webhooks and WebSockets.
- [fallbacks.md](fallbacks.md): REST fallback, MCP alternative, errors, limits, and idempotency.

Machine-readable indexes:

- [llms.txt](llms.txt)
- [llms-full.txt](llms-full.txt)

The authored skill package lives in `agentmail/` in the repository, but hosted
links are intentionally sibling links with no package prefix so they work both
on `https://agentmail.md/` and in exported skill folders.
