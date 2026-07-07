# AgentMail Skills

Markdown skills that teach an AI agent how to use [AgentMail](https://agentmail.to) —
the email inbox API for agents. Each skill is a raw markdown file you can fetch
and drop straight into an agent's context.

## Skills

- **[signup](https://agentmail.md/signup)** — get yourself an email address: self-serve an inbox + API key with no human in the console, then get claimed via OTP.
- **[core](https://agentmail.md/core)** — create inboxes and send/receive/reply to email over the REST API (auth, threads, pagination, idempotency, rate limits).
- **[webhooks](https://agentmail.md/webhooks)** — receive email events by push to a public HTTPS URL; verify Svix signatures; build an event-driven agent.
- **[websockets](https://agentmail.md/websockets)** — stream email events over a WebSocket with no public URL; react in real time (e.g. wait for an OTP).

New agent with no API key? Start with **signup**. Otherwise start with **core** — the
other skills assume the auth and endpoint basics it covers.

## Usage

Fetch any skill as raw markdown — no extension needed:

```bash
curl https://agentmail.md/core
```

The `.md` form works too (`https://agentmail.md/core.md`), and the
root path serves this index.
