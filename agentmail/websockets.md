# AgentMail WebSockets

Use WebSockets when an agent process needs realtime inbound mail but does not
run a public HTTPS webhook receiver. Use [webhooks.md](webhooks.md) for
always-on production servers.

Subscribe to `message.received` for auto-reply or OTP flows. Use the CLI for
normal inbox, send, reply, label, and attachment work after an event arrives.

## SDK Stream

Python:

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

TypeScript:

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

## Raw Protocol

Connect to:

```text
wss://ws.agentmail.to/v0?api_key=$AGENTMAIL_API_KEY
```

EU region:

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
- Reconnect with backoff and resubscribe after reconnecting.
- If an event payload is too small for the task, retrieve the full message or
  thread with the CLI.
