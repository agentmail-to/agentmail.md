---
name: webhooks
description: Receive AgentMail email events by webhook — register endpoints, handle payloads, verify Svix signatures, build an event-driven agent.
---

# AgentMail webhooks

Webhooks push email events to your HTTPS endpoint the moment they happen — no polling.
Use them for a persistent, publicly reachable server.

**When to use what:**

- **Webhooks** (this skill) — you run a server with a **public HTTPS URL**. Best for
  always-on backends. For local dev, tunnel with `ngrok http 3000` and register the
  tunnel URL.
- **[websockets](https://agentmail.md/websockets)** — no public URL; you connect
  outward. Best for CLIs, notebooks, or waiting on a specific email.
- **Polling** (`GET .../messages` in [core](https://agentmail.md/core)) — simplest, no
  infra, higher latency.

This skill assumes you already have an API key and know the send/receive basics from
[core](https://agentmail.md/core).

## Event types

Ten event types:

| Event | Fires when |
| --- | --- |
| `message.received` | An inbound email arrives. |
| `message.received.spam` | Inbound classified as spam. |
| `message.received.blocked` | Inbound from a blocked sender. |
| `message.received.unauthenticated` | Inbound failing SPF/DKIM/DMARC. |
| `message.sent` | Your outbound message was accepted for delivery. |
| `message.delivered` | Delivered to the recipient's server. |
| `message.bounced` | Delivery failed. |
| `message.complained` | Recipient marked it as spam. |
| `message.rejected` | Rejected before send. |
| `domain.verified` | A custom domain finished verifying. |

**`message.received.spam` / `.blocked` / `.unauthenticated` are excluded by default** and
require extra permissions on your account — request them if you need to see filtered
mail.

## Register a webhook

`POST /v0/webhooks` (org-level; delivers events for all your inboxes).

| Field | Notes |
| --- | --- |
| `url` | Your public HTTPS endpoint. |
| `event_types` | Array to subscribe to. Omit for the default set. |
| `client_id` | Idempotency key (see [core](https://agentmail.md/core#idempotent-creation-with-client_id)). |

```bash
curl -X POST https://api.agentmail.to/v0/webhooks \
  -H "Authorization: Bearer $AGENTMAIL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.com/webhooks/agentmail",
    "event_types": ["message.received"],
    "client_id": "prod-webhook-1"
  }'
```

The response includes a **`secret` like `whsec_...` — store it now.** You need it to
verify signatures, and the full secret is only returned on create (and via get).

## Manage webhooks

| Operation | Endpoint |
| --- | --- |
| List | `GET /v0/webhooks` |
| Get one (incl. secret) | `GET /v0/webhooks/{webhook_id}` |
| Update | `PATCH /v0/webhooks/{webhook_id}` |
| Delete | `DELETE /v0/webhooks/{webhook_id}` |

Inbox-scoped variants exist (`.../inboxes/{inbox_id}/webhooks`) if you want events for a
single inbox only.

## Payload shape

Events are delivered as JSON. A `message.received` body:

```json
{
  "type": "event",
  "event_type": "message.received",
  "event_id": "evt_...",
  "message": {
    "inbox_id": "support@agentmail.to",
    "thread_id": "1bab428c-...",
    "message_id": "<...@email.amazonses.com>",
    "labels": ["received", "unread"],
    "from": "Customer <customer@example.com>",
    "to": ["support@agentmail.to"],
    "subject": "Re: Hello",
    "text": "...",
    "html": "...",
    "extracted_text": "...just the new reply...",
    "extracted_html": "...",
    "attachments": [ ... ]
  },
  "thread": { "thread_id": "1bab428c-...", "message_count": 2, "...": "..." }
}
```

- Other events carry a different payload key: `message.sent`/`.delivered` →
  `send`/`delivery`, `.bounced` → `bounce`, `.complained` → `complaint`, `.rejected` →
  `reject`, `domain.verified` → `domain`. All share `type`, `event_type`, `event_id`.
- The sender field is JSON **`from`** — the **Python SDK exposes it as `from_`**.
- **1 MB payload cap.** Oversized payloads **omit `text`/`html`** (and other large
  fields). When they're missing, **fall back to `GET .../messages/{message_id}`** from
  [core](https://agentmail.md/core) to fetch the full body.

## Verify the signature

AgentMail delivers via **Svix**. Each request carries `svix-id`, `svix-timestamp`, and
`svix-signature` headers. **Verify every request** with your `whsec_...` secret before
trusting it, using the raw request body.

**Python** (`pip install svix`):

```python
from svix.webhooks import Webhook

wh = Webhook(WEBHOOK_SECRET)  # "whsec_..."
# raw_body: the exact bytes of the request body; headers: the request headers
payload = wh.verify(raw_body, headers)  # raises on bad signature
```

**TypeScript** (`npm install svix`):

```typescript
import { Webhook } from "svix";

const wh = new Webhook(WEBHOOK_SECRET);
const payload = wh.verify(rawBody, {
  "svix-id": req.headers["svix-id"],
  "svix-timestamp": req.headers["svix-timestamp"],
  "svix-signature": req.headers["svix-signature"],
});
```

- **Verify against the RAW body**, not a re-serialized object. If your framework parses
  JSON automatically, capture the raw bytes first (e.g. Express: `express.raw({type:
  'application/json'})`) — re-stringifying changes the bytes and the signature fails.
- **`svix-id` is stable across retries — use it as your dedupe key.** Svix retries on
  non-2xx or timeout, so the same event can arrive more than once. (`event_id` in the
  body works too.)

## Receiver pattern & minimal event-driven agent

Return **`200` immediately** so Svix doesn't retry; do the real work asynchronously.

```python
from flask import Flask, request, abort
from svix.webhooks import Webhook, WebhookVerificationError

app = Flask(__name__)
wh = Webhook(WEBHOOK_SECRET)
seen = set()  # persist this across restarts in real deployments

@app.post("/webhooks/agentmail")
def hook():
    try:
        event = wh.verify(request.get_data(), dict(request.headers))
    except WebhookVerificationError:
        abort(400)

    if event["event_id"] in seen:      # dedupe (svix-id also works)
        return "", 200
    seen.add(event["event_id"])

    # Only act on inbound mail. See the self-loop warning below.
    if event["event_type"] == "message.received":
        enqueue(event)                 # hand off; do NOT block the response

    return "", 200                     # ack fast, always
```

Then, off the request path, handle the event: load context with
`GET .../threads/{thread_id}`, generate a reply, and `POST .../messages/{message_id}/reply`
(all in [core](https://agentmail.md/core)).

**⚠️ Self-loop warning:** your own replies emit `message.sent` and `message.delivered`
events. If your handler reacts to those, it can email itself in a loop. **Gate on
`event_type == "message.received"`** (and ignore mail from your own inbox address).
