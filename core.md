---
name: core
description: Create AgentMail inboxes and send/receive/reply to email via the REST API (auth, endpoints, pagination, idempotency, rate limits).
---

# AgentMail Core API

AgentMail is an email inbox API for agents. This skill is the foundation: authenticate,
create inboxes, send mail, receive by polling, load threads, reply, forward, label, and
handle attachments. Everything is plain REST over `https://api.agentmail.to`.

- No API key yet? → [signup](https://agentmail.md/signup) provisions one.
- Want push instead of polling? → [webhooks](https://agentmail.md/webhooks) (public
  server) or [websockets](https://agentmail.md/websockets) (no public URL).

## Setup & auth

Get an API key one of two ways:

1. **Console** — a human creates one at `console.agentmail.to`.
2. **Self-signup** — you provision your own via
   [signup](https://agentmail.md/signup).

Every authenticated call uses a bearer token. Canonical skeleton:

```bash
curl https://api.agentmail.to/v0/inboxes \
  -H "Authorization: Bearer $AGENTMAIL_API_KEY"
```

- Base URL `https://api.agentmail.to`; all endpoints live under `/v0/`. (EU region:
  `https://api.agentmail.eu`.)
- **`403` means the key is invalid, lacks permission, or you've hit a limit** — the
  same status covers "already exists / name taken / quota exceeded."
- **Never send the API key anywhere except `api.agentmail.to`.**

SDKs wrap all of this (see [SDKs](#sdks) at the end); examples here are curl-first so
they work from anything.

## Inboxes

`POST /v0/inboxes`

| Field | Required | Notes |
| --- | --- | --- |
| `username` | no | Local part. Omit for a random one. |
| `domain` | no | **Omit → address on `@agentmail.to`.** Custom domains must be verified first. |
| `display_name` | no | Friendly From name. |
| `client_id` | no | Idempotency key — see below. Cannot contain `@`. |
| `metadata` | no | Arbitrary key/value map stored on the inbox. |

```bash
curl -X POST https://api.agentmail.to/v0/inboxes \
  -H "Authorization: Bearer $AGENTMAIL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "username": "support", "display_name": "Support", "client_id": "support-inbox-1" }'
```

Response (`email` is your address; `inbox_id` is the inbox's identifier used in API
paths — the same value today):

```json
{
  "inbox_id": "support@agentmail.to",
  "email": "support@agentmail.to",
  "organization_id": "org_...",
  "display_name": "Support",
  "client_id": "support-inbox-1",
  "created_at": "2026-07-06T09:44:11.531Z",
  "updated_at": "2026-07-06T09:44:11.531Z"
}
```

- List: `GET /v0/inboxes` — `{ "count", "limit", "inboxes": [...] }`.
- Get one: `GET /v0/inboxes/{inbox_id}`.

### Idempotent creation with `client_id`

Pass a `client_id` on create ops. If you retry with the same `client_id`, AgentMail
returns the **original** resource with `200` instead of creating a duplicate — **other
fields in the retry are ignored** (you get back the first one's values). Use a stable
`client_id` derived from your own state so a crashed-and-retried create never doubles
up. (This is a body field, not a header, and applies to inbox/webhook/domain creates.)

## Sending

`POST /v0/inboxes/{inbox_id}/messages/send`

| Field | Notes |
| --- | --- |
| `to` | Array of recipient addresses. |
| `cc`, `bcc` | Arrays. |
| `subject` | String. |
| `text` | Plain-text body. |
| `html` | HTML body. |
| `reply_to` | Array of Reply-To addresses. |
| `labels` | Array of strings — your own tags (see [Labels](#labels)). |
| `headers` | Object of extra custom headers. |
| `attachments` | See [Attachments](#attachments). |

```bash
curl -X POST https://api.agentmail.to/v0/inboxes/support@agentmail.to/messages/send \
  -H "Authorization: Bearer $AGENTMAIL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": ["customer@example.com"],
    "subject": "Hello",
    "text": "Plain text body.",
    "html": "<p>HTML body.</p>",
    "labels": ["outreach"]
  }'
```

Response: `{ "message_id": "...", "thread_id": "..." }`.

- **Always send both `text` and `html`** — better deliverability and a fallback for
  every client.
- **50-recipient cap** total across `to` + `cc` + `bcc`.

## Receiving by polling

`GET /v0/inboxes/{inbox_id}/messages` — newest first.

| Query param | Purpose |
| --- | --- |
| `limit` | Page size (**capped at 100**). |
| `page_token` | Next-page cursor (see [Pagination](#pagination-limits--errors)). |
| `labels` | Filter by label. |
| `from`, `to`, `subject` | Substring filters (repeatable; all must match). |
| `before`, `after` | Datetime bounds. |
| `ascending` | Oldest first. |
| `include_spam`, `include_trash` | Include those folders. |

```bash
curl "https://api.agentmail.to/v0/inboxes/support@agentmail.to/messages?limit=20&labels=unread" \
  -H "Authorization: Bearer $AGENTMAIL_API_KEY"
```

List items carry metadata + `preview` but not full bodies. Fetch a full message:

`GET /v0/inboxes/{inbox_id}/messages/{message_id}`

```json
{
  "inbox_id": "support@agentmail.to",
  "thread_id": "1bab428c-...",
  "message_id": "<...@email.amazonses.com>",
  "labels": ["received", "unread"],
  "from": "Customer <customer@example.com>",
  "to": ["support@agentmail.to"],
  "subject": "Re: Hello",
  "text": "...full body incl. quoted history...",
  "html": "...",
  "extracted_text": "...just the new reply, quotes stripped...",
  "extracted_html": "...",
  "attachments": [ ... ],
  "timestamp": "2026-07-06T09:44:22.000Z"
}
```

- **Feed `extracted_text` (or `extracted_html`) to an LLM, not `text`.** The `extracted_*`
  fields strip quoted history and signatures, leaving only what the sender actually
  wrote in this message.
- The sender field is JSON **`from`**. The **Python SDK renames it to `from_`** (`from`
  is a reserved word) — access `message.from_` there.

## Threads

A thread groups a conversation. `thread_id` comes back on every send/receive.

- List: `GET /v0/inboxes/{inbox_id}/threads` (same filters as messages).
- Get one: `GET /v0/inboxes/{inbox_id}/threads/{thread_id}` — **includes the full
  `messages` array.** This is the right call to load context before replying.

**Thread labels are the union of its messages' labels** — useful for coarse filtering.

## Replying & forwarding

Reply to a specific message (auto-threading; Subject/`In-Reply-To`/`References` headers
set for you):

`POST /v0/inboxes/{inbox_id}/messages/{message_id}/reply`

```bash
curl -X POST "https://api.agentmail.to/v0/inboxes/support@agentmail.to/messages/$MESSAGE_ID/reply" \
  -H "Authorization: Bearer $AGENTMAIL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "text": "Thanks!", "html": "<p>Thanks!</p>" }'
```

- **No `to` needed** — the reply goes to the original sender automatically.
- Reply to everyone (original To + Cc): `POST .../messages/{message_id}/reply-all`.
- Forward: `POST .../messages/{message_id}/forward` (takes `to`, and optional `text`/`html`).
- The 50-recipient cap and the send-both-`text`+`html` rule apply here too.

## Labels

Labels are freeform strings you attach to messages for search and segmentation (an
inbox uses reserved ones like `sent`, `received`, `unread`, `spam`). Set them on send,
or change them after:

`PATCH /v0/inboxes/{inbox_id}/messages/{message_id}`

```bash
curl -X PATCH "https://api.agentmail.to/v0/inboxes/support@agentmail.to/messages/$MESSAGE_ID" \
  -H "Authorization: Bearer $AGENTMAIL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "add_labels": ["handled"], "remove_labels": ["unread"] }'
```

**Labels-as-metadata pattern:** tag messages (`ticket-123`, `needs-review`,
`campaign-x`) then filter with `?labels=...` on the list endpoints. Because a thread's
labels are the union of its messages', you can segment whole conversations this way.

## Attachments

**Receiving** — attachments come back as metadata, not inline bytes. Each has
`attachment_id`, `filename`, `size`, `content_type`, `content_disposition`
(`inline` | `attachment`). To download, request the attachment to get a short-lived
`download_url` (+ `expires_at`) and fetch that URL — don't expect the bytes in the
message JSON.

**Sending** — provide either base64 `content` or an HTTPS `url`:

```json
"attachments": [
  { "filename": "invoice.pdf", "content": "<base64>" },
  { "filename": "logo.png", "url": "https://example.com/logo.png" }
]
```

- `content_type` is auto-detected from the filename.
- A provided `url` **must be HTTPS**.

## Pagination, limits & errors

**Pagination** — list responses include a `next_page_token` when more exist. Loop:

```bash
token=""
while :; do
  resp=$(curl -s "https://api.agentmail.to/v0/inboxes/support@agentmail.to/messages?limit=100&page_token=$token" \
    -H "Authorization: Bearer $AGENTMAIL_API_KEY")
  # ...process resp.messages...
  token=$(echo "$resp" | jq -r '.next_page_token // empty')
  [ -z "$token" ] && break
done
```

`limit` is **capped at 100** on filtered lists.

**Rate limits** — over quota returns `429` with a `Retry-After` header (seconds). Back
off for that long, then retry; use exponential backoff on repeats.

**Errors** — non-2xx bodies are `{ "statusCode": <int>, "message": "<why>" }`.

| Status | Meaning |
| --- | --- |
| `400` | Malformed request / invalid field. |
| `401` | Missing/invalid API key. |
| `403` | No permission, or already-exists / name-taken / **limit exceeded**. |
| `404` | Inbox/message/thread not found. |
| `429` | Rate-limited — honor `Retry-After`. |

**Plan quotas** (per plan; `GET /v0/organizations` returns your live `inbox_limit`,
`domain_limit`, and current counts):

| Plan | Inboxes | Sends/day | Sends/month |
| --- | --- | --- | --- |
| Free | 3 | 100 | — |
| Developer ($20/mo) | 10 | 1,000 | 10,000 |
| Startup ($200/mo) | 150 | 15,000 | 150,000 |

An unclaimed agent is on the **Agent** tier — 1 inbox, 10 sends/day (see
[signup](https://agentmail.md/signup)).

## SDKs

Official SDKs wrap every endpoint above.

**Python** — `pip install agentmail`

```python
from agentmail import AgentMail
client = AgentMail(api_key="...")  # or AGENTMAIL_API_KEY env var
inbox = client.inboxes.create(username="support")
client.inboxes.messages.send(inbox_id=inbox.inbox_id, to=["a@b.com"],
                             text="hi", html="<p>hi</p>")
```
Remember the sender field is `message.from_` in Python.

**TypeScript / Node** — `npm install agentmail`

```typescript
import { AgentMailClient } from "agentmail";
const client = new AgentMailClient({ apiKey: process.env.AGENTMAIL_API_KEY });
```

Confirm the latest install names and method signatures at
`https://docs.agentmail.to/quickstart`.
