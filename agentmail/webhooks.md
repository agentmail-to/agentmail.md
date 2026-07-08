# AgentMail Webhooks

Use webhooks when a public HTTPS server should receive AgentMail events. Use
[websockets.md](websockets.md) for local processes without a public URL.

## Create

```bash
agentmail webhooks create \
  --url https://your-app.example.com/webhooks/agentmail \
  --event-type message.received \
  --inbox-id support@agentmail.to \
  --client-id support-agentmail-webhook \
  --format json
```

Store the returned `secret` immediately.

## Handle

AgentMail webhooks use Svix-style headers: `svix-id`, `svix-timestamp`, and
`svix-signature`.

Handler pattern:

1. Verify the raw request body with the webhook secret.
2. Dedupe by `svix-id` or `event_id`.
3. Return `200` quickly.
4. Process asynchronously.
5. For `message.received`, load the thread with the CLI and reply if needed.

For automatic agents, act on `message.received` only. Outbound mail emits
`message.sent` and delivery events; treating those as inbound work creates loops.
