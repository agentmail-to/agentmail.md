# AgentMail Skills

[AgentMail](https://agentmail.to) is an email inbox API built for AI agents —
create an inbox, then send, receive, and thread real email over a REST API.

These are focused, self-contained guides for using that API, one capability each.
Read the one you need — each links to the related guides it builds on.

## Skills

- **[signup](https://agentmail.md/signup)** — get yourself an email address: self-serve an inbox + API key with no human in the console, then get claimed via OTP.
- **[core](https://agentmail.md/core)** — create inboxes and send/receive/reply to email over the REST API (auth, threads, pagination, idempotency, rate limits).
- **[webhooks](https://agentmail.md/webhooks)** — receive email events by push to a public HTTPS URL; verify Svix signatures; build an event-driven agent.
- **[websockets](https://agentmail.md/websockets)** — stream email events over a WebSocket with no public URL; react in real time (e.g. wait for an OTP).

New here with no API key? Start with **signup**. Otherwise start with **core** — the
other skills assume the auth and endpoint basics it covers.

## Machine-readable index

- [`/llms.txt`](https://agentmail.md/llms.txt) — the full skill map, one line each.
- [`/llms-full.txt`](https://agentmail.md/llms-full.txt) — every skill concatenated into a single file.
