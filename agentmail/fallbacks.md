# AgentMail Fallbacks and Limits

Use this file when the CLI is unavailable, missing a required operation, or
being integrated into a harness that already exposes HTTP or MCP tools.

## REST Fallback

Base URL:

```text
https://api.agentmail.to/v0
```

EU region:

```text
https://api.agentmail.eu/v0
```

Example:

```bash
curl https://api.agentmail.to/v0/inboxes \
  -H "Authorization: Bearer $AGENTMAIL_API_KEY"
```

Use REST as a fallback, not the default path for this skill. When REST is needed,
prefer stable API features from the AgentMail docs and codebase over guessed
payload shapes.

## MCP Alternative

MCP is an alternative integration path when the user or harness already wants
MCP tools. Do not make it the default path for normal agent workflows.

Hosted server:

```text
https://mcp.agentmail.to/mcp
```

Supported authentication:

- OAuth in compatible MCP clients.
- API key in `?apiKey=...`.
- API key in an `x-api-key` header.

Do not use stale local MCP server guidance from old skills unless the current
AgentMail docs explicitly reintroduce it.

## Idempotency

- Self-signup is idempotent by `human_email`, but each repeat signup rotates
  the API key.
- Create operations such as inboxes and webhooks support `client_id`; use a
  stable value for resources the agent may retry creating.
- Message send idempotency belongs in the `Idempotency-Key` request header when
  using REST. Do not put idempotency keys in the JSON body.

## Errors and Rate Limits

Error bodies use JSON with `name` and `message`. Validation errors include an
`errors` array.

Common statuses:

| Status | Meaning |
| --- | --- |
| `401` | Missing or invalid API key. |
| `403` | Forbidden, already exists, name taken, limit exceeded, domain not verified, or message rejected. Read `message`. |
| `409` | Conflict, race, deleting resource, or cannot delete. |
| `422` | Unprocessable request. |
| `429` | Rate limited; honor `Retry-After` and back off. |

Filtered list/search requests cap `limit` at 100.

## Plan Limits

| Plan | Inboxes | Domains | Sends/day | Sends/month |
| --- | --- | --- | --- | --- |
| Agent unverified | 1 | 0 | 10 | - |
| Free | 3 | 0 | 100 | - |
| Developer | 10 | 10 | 1,000 | 10,000 |
| Startup | 150 | 150 | 15,000 | 150,000 |

## Recipient and Attachment Limits

- Replies and sends are capped at 50 total recipients across `to`, `cc`, and
  `bcc`.
- When sending attachments through REST, provide exactly one of base64 `content`
  or `url`.
- Attachment download URLs are short-lived; fetch them before `expires_at`.
