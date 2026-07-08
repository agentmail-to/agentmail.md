---
name: websockets
description: Stream AgentMail email events over WebSocket — connect with an API key, subscribe to inboxes/event types, react in real time without a public URL.
---

# AgentMail WebSockets

Stream email events over a WebSocket you open outward — real-time delivery with **no
public URL required**. Ideal when you can't (or don't want to) run a webhook receiver.

**When to use what:**

- **WebSockets** (this skill) — actively waiting for a specific email (an OTP / 2FA
  code, a confirmation), or a long-running process / CLI / notebook that can hold a
  connection. No inbound URL needed.
- **[webhooks](https://agentmail.md/webhooks)** — an always-on server with a public
  HTTPS endpoint.
- **Polling** (`GET .../messages` in [core](https://agentmail.md/core)) — simplest, no
  persistent connection, higher latency.

Assumes you already have an API key and the send/receive basics from
[core](https://agentmail.md/core).

## Connecting & protocol

Connect to `wss://ws.agentmail.to/v0`, passing the API key as the `api_key` query
parameter (EU region: `wss://ws.agentmail.eu/v0`):

```
wss://ws.agentmail.to/v0?api_key=$AGENTMAIL_API_KEY
```

> The **SDK's `connect()` (further down) is the vendor-maintained way to open this
> connection** — it handles the URL and framing for you. Prefer it unless you need a
> raw client.

After connecting, **send a subscribe frame** to choose what you receive. Empty arrays
mean "everything you're allowed to see":

```json
{ "type": "subscribe", "event_types": [], "inbox_ids": [], "pod_ids": [] }
```

Only `type` is required. Narrow the stream by listing `inbox_ids` and/or `event_types`
(same names as in [webhooks](https://agentmail.md/webhooks#event-types), e.g.
`message.received`).

The server replies with a **`subscribed`** confirmation echoing your filters:

```json
{ "type": "subscribed", "event_types": ["message.received"], "inbox_ids": ["agent@agentmail.to"], "pod_ids": [] }
```

Then it streams **event frames** — same payloads as webhooks, wrapped with
`type: "event"`:

```json
{
  "type": "event",
  "event_type": "message.received",
  "event_id": "evt_...",
  "message": { "inbox_id": "agent@agentmail.to", "thread_id": "...", "message_id": "...",
               "from": "sender@example.com", "subject": "...", "extracted_text": "...", "...": "..." },
  "thread": { "thread_id": "...", "message_count": 1, "...": "..." }
}
```

Errors arrive as `{ "type": "error", "name": "...", "message": "..." }`. The sender field
is JSON `from` (Python SDK: `from_`).

## Raw client example

Any WebSocket client works. With [`websocat`](https://github.com/vi/websocat):

```bash
# Connect, subscribe to inbound mail on one inbox, print event frames as they arrive.
( echo '{"type":"subscribe","event_types":["message.received"],"inbox_ids":["agent@agentmail.to"]}'; cat ) \
  | websocat "wss://ws.agentmail.to/v0?api_key=$AGENTMAIL_API_KEY"
```

Minimal Python (`pip install websockets`):

```python
import asyncio, json, os, websockets

URL = f"wss://ws.agentmail.to/v0?api_key={os.environ['AGENTMAIL_API_KEY']}"

async def main():
    async with websockets.connect(URL) as ws:
        await ws.send(json.dumps({
            "type": "subscribe",
            "event_types": ["message.received"],
            "inbox_ids": ["agent@agentmail.to"],
        }))
        async for raw in ws:
            frame = json.loads(raw)
            if frame.get("type") == "event":
                print(frame["event_type"], frame["message"]["subject"])

asyncio.run(main())
```

## Worked example: wait for a 2FA / OTP code

The canonical WebSocket use — you triggered a sign-in and need the code emailed back.
Open a narrowly filtered connection, block until the message lands, extract the code,
close:

```python
import asyncio, json, os, re, websockets

URL = f"wss://ws.agentmail.to/v0?api_key={os.environ['AGENTMAIL_API_KEY']}"

async def wait_for_otp(inbox_id: str, timeout: float = 120) -> str:
    async with websockets.connect(URL) as ws:
        await ws.send(json.dumps({
            "type": "subscribe",
            "event_types": ["message.received"],
            "inbox_ids": [inbox_id],
        }))
        async with asyncio.timeout(timeout):
            async for raw in ws:
                frame = json.loads(raw)
                if frame.get("type") != "event":
                    continue
                body = frame["message"].get("extracted_text", "")
                m = re.search(r"\b(\d{6})\b", body)   # tune to your sender's format
                if m:
                    return m.group(1)                  # connection closes on return
```

Use `extracted_text` (quotes stripped) for cleaner matching. Set a timeout so you don't
block forever if the code never arrives.

## SDK pointer

The official SDKs manage the connection, subscribe, and framing for you.

**Python** (`pip install agentmail`):

```python
from agentmail import AgentMail
from agentmail.websockets import Subscribe   # import path may vary by version

client = AgentMail(api_key="...")
with client.websockets.connect() as socket:
    socket.send_subscribe(Subscribe(inbox_ids=["agent@agentmail.to"]))
    for event in socket:
        ...
```

**TypeScript** (`npm install agentmail`):

```typescript
import { AgentMailClient } from "agentmail";
const client = new AgentMailClient({ apiKey: process.env.AGENTMAIL_API_KEY });
const socket = await client.websockets.connect();
socket.sendSubscribe({ type: "subscribe", inboxIds: ["agent@agentmail.to"] });
```

Confirm exact method names against `https://docs.agentmail.to/websockets`.

## Agent loop recipe

For a long-running reactive agent:

1. **Connect** and send a `subscribe` frame filtered to your inbox(es) and
   `message.received`.
2. On each event, **dedupe on `event_id`** (you may see repeats across reconnects).
3. **Load context** with `GET .../threads/{thread_id}` and **reply** with
   `POST .../messages/{message_id}/reply` — all over REST (see
   [core](https://agentmail.md/core)); the WebSocket is receive-only.
4. **Reconnect with exponential backoff** on drop, and re-subscribe on every new
   connection.
5. **Avoid self-loops:** subscribe only to `message.received` (not `message.sent` /
   `.delivered`) and ignore mail from your own address.
