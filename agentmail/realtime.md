# AgentMail Realtime Delivery

Use realtime delivery only when polling with `agentmail inboxes:messages list`
is not enough. The CLI remains the primary interface for inbox and message work.

Choose:

- Webhooks for an always-on public HTTPS server.
- WebSockets for a local agent process, worker, notebook, or one-off wait loop.

## Event Types

AgentMail supports these webhook and WebSocket event types:

| Event | Meaning |
| --- | --- |
| `message.received` | New inbound email. |
| `message.received.spam` | Inbound classified as spam; requires extra permission. |
| `message.received.blocked` | Inbound from a blocked sender; requires extra permission. |
| `message.received.unauthenticated` | Inbound without passing SPF/DKIM/DMARC; requires extra permission. |
| `message.sent` | Outbound message accepted for sending. |
| `message.delivered` | Recipient server accepted delivery. |
| `message.bounced` | Delivery failed. |
| `message.complained` | Recipient marked mail as spam. |
| `message.rejected` | Message rejected before send. |
| `domain.verified` | Custom domain verification completed. |

For auto-reply agents, subscribe to `message.received` only. Your own replies
emit outbound lifecycle events and can create loops if handled as inbound work.

## Webhooks

Use webhooks when a persistent server should receive email events as they
happen.

```bash
agentmail webhooks create \
  --url https://your-app.example.com/webhooks/agentmail \
  --event-type message.received \
  --client-id prod-agentmail-webhook \
  --format json
```

Scope to an inbox when only one inbox should trigger it:

```bash
agentmail webhooks create \
  --url https://your-app.example.com/webhooks/agentmail \
  --event-type message.received \
  --inbox-id support@agentmail.to \
  --client-id support-agentmail-webhook \
  --format json
```

Manage webhooks:

```bash
agentmail webhooks list --format json
agentmail webhooks retrieve --webhook-id <webhook_id> --format json
agentmail webhooks delete --webhook-id <webhook_id>
```

The create response includes a `secret` like `whsec_...`. Store it immediately.

AgentMail webhooks use Svix-style headers:

- `svix-id`
- `svix-timestamp`
- `svix-signature`

Verify every request with the raw request body and the `whsec_...` secret. Do
not verify a re-serialized JSON object; byte changes break signature validation.

Receiver pattern:

1. Verify the raw body signature.
2. Dedupe by `svix-id` or `event_id`.
3. Acknowledge `200` quickly.
4. Process asynchronously.
5. For `message.received`, load the full thread with the CLI.
6. Reply through the CLI.
7. Mark the inbound message handled with labels.

## WebSockets

Use WebSockets when an agent process needs realtime inbound email but does not
run a public HTTPS webhook receiver.

Python SDK:

```python
from agentmail import AgentMail, MessageReceivedEvent, Subscribe, Subscribed

client = AgentMail()

with client.websockets.connect() as socket:
    socket.send_subscribe(Subscribe(inbox_ids=["agent@agentmail.to"]))
    for event in socket:
        if isinstance(event, Subscribed):
            print("subscribed", event.inbox_ids)
        elif isinstance(event, MessageReceivedEvent):
            print(event.message.subject, event.message.from_)
```

TypeScript SDK:

```typescript
import { AgentMailClient } from "agentmail";

const client = new AgentMailClient();
const socket = await client.websockets.connect();

socket.on("message", async (event) => {
  if (event.type === "event" && event.eventType === "message.received") {
    console.log(event.message.subject, event.message.from);
  }
});

await socket.waitForOpen();
socket.sendSubscribe({
  type: "subscribe",
  inboxIds: ["agent@agentmail.to"],
});
```

Raw WebSocket endpoint:

```text
wss://ws.agentmail.to/v0?api_key=$AGENTMAIL_API_KEY
```

EU endpoint:

```text
wss://ws.agentmail.eu/v0?api_key=$AGENTMAIL_API_KEY
```

Subscribe frame:

```json
{ "type": "subscribe", "event_types": ["message.received"], "inbox_ids": ["agent@agentmail.to"] }
```

Omit `inbox_ids` and `pod_ids` to subscribe to the scope of the API key. Do not
send empty arrays when you mean "all"; an empty list matches nothing.

## Wait for an OTP

Use WebSockets only to wait for the message. Use CLI commands for everything
else.

```python
import re
from agentmail import AgentMail, MessageReceivedEvent, Subscribe

client = AgentMail()

def wait_for_otp(inbox_id: str) -> str:
    with client.websockets.connect() as socket:
        socket.send_subscribe(Subscribe(
            inbox_ids=[inbox_id],
            event_types=["message.received"],
        ))
        for event in socket:
            if not isinstance(event, MessageReceivedEvent):
                continue
            body = event.message.extracted_text or event.message.text or ""
            match = re.search(r"\b(\d{6})\b", body)
            if match:
                return match.group(1)
```

After extracting the code, continue with the CLI:

```bash
agentmail agent verify --otp-code 123456
```

## Loop Rules

- Dedupe every event by `event_id`.
- Ignore mail from your own inbox address unless self-addressed workflows are
  intentional.
- Reconnect WebSockets with backoff and resubscribe after reconnecting.
- If an event payload is too small for the task, retrieve the full message or
  thread with the CLI.
