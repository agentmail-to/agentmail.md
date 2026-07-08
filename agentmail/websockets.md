# AgentMail WebSockets

Use WebSockets when a local agent process needs realtime inbound mail. Use the
CLI for normal inbox, send, reply, label, and attachment work after an event
arrives.

## Python

```python
from agentmail import AgentMail, MessageReceivedEvent, Subscribe

client = AgentMail()

with client.websockets.connect() as socket:
    socket.send_subscribe(Subscribe(
        inbox_ids=["agent@agentmail.to"],
        event_types=["message.received"],
    ))
    for event in socket:
        if isinstance(event, MessageReceivedEvent):
            print(event.message.subject, event.message.from_)
```

## Raw Protocol

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

Omit `inbox_ids` and `pod_ids` to subscribe to the API key scope. Do not send
empty arrays when you mean "all".

## Loop Rules

- Dedupe every event by `event_id`.
- Ignore mail from your own inbox address unless self-addressed workflows are
  intentional.
- Reconnect with backoff and resubscribe after reconnecting.
