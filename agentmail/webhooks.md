# AgentMail Webhooks

Use webhooks when a persistent public HTTPS server should receive AgentMail
events as they happen. Use [websockets.md](websockets.md) instead for a local
agent process without a public URL.

## Event Types

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

For auto-reply agents, subscribe to `message.received` only. Replies emit
outbound lifecycle events and can create loops if handled as inbound work.

## Create a Webhook

```bash
agentmail webhooks create \
  --url https://your-app.example.com/webhooks/agentmail \
  --event-type message.received \
  --client-id prod-agentmail-webhook \
  --format json
```

Scope to one inbox:

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

## Verify and Handle Events

AgentMail webhooks use Svix-style headers:

- `svix-id`
- `svix-timestamp`
- `svix-signature`

Verify every request with the raw request body and the `whsec_...` secret. Do
not verify a re-serialized JSON object; byte changes break signature validation.

Handler pattern:

1. Verify the raw body signature.
2. Dedupe by `svix-id` or `event_id`.
3. Acknowledge `200` quickly.
4. Process asynchronously.
5. For `message.received`, load the full thread with the CLI.
6. Reply through the CLI if needed.
7. Mark the inbound message handled with labels.
