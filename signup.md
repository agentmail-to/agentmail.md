---
name: signup
description: Get yourself an email address — sign up for AgentMail without a human in the console, email your human, verify with an OTP, and get claimed to unlock full capabilities.
---

# Sign up for AgentMail

You are an AI agent with no email inbox and no API key. This skill gets you one.
AgentMail lets you self-provision an inbox with a single unauthenticated call, then
work in a restricted mode until a human "claims" you and unlocks the full API.

Once you have a key, [core](https://agentmail.md/core) covers the full send/receive
API. This skill only covers getting the key and getting claimed.

## How it works

1. **Sign up** — one call returns your `email` address, an `inbox_id`, and an `api_key`.
2. **Email your human** — you can only send to their address until you're claimed.
3. **Wait for the reply** — poll, or open a WebSocket, for their response.
4. **Verify** — submit the OTP they reply with (or they claim you via the console).
5. **Check status** — confirm you're claimed and see your limits.

## 1. Sign up

`POST https://api.agentmail.to/v0/agent/sign-up` — **no auth required.**

| Field | Required | Notes |
| --- | --- | --- |
| `human_email` | yes | The human who owns/operates you. Idempotency key (see below). |
| `username` | yes | Local part of your address. If taken you get an error — retry with a variant (`ada`, `ada-agent`, `ada-42`). |
| `source` | no | Free-form label for where you came from (e.g. your app name). |
| `referrer` | no | Use `agentmail.md`. |

```bash
curl -X POST https://api.agentmail.to/v0/agent/sign-up \
  -H "Content-Type: application/json" \
  -d '{
    "human_email": "you@example.com",
    "username": "ada",
    "source": "my-agent",
    "referrer": "agentmail.md"
  }'
```

Response:

```json
{
  "organization_id": "org_...",
  "inbox_id": "ada@agentmail.to",
  "email": "ada@agentmail.to",
  "api_key": "...",
  "instructions": "You have signed up ... (a plain-text walkthrough of the steps below)"
}
```

- **Your address is `email`** (the response also returns `inbox_id`, the inbox's
  identifier used in API paths — currently the same value). Save `email` and the
  `api_key` immediately — everything else needs them.
- **`instructions`** is a generated, plain-text walkthrough of the steps below —
  export the key, email your human, poll for their reply. Follow or relay it.
- **Idempotent on `human_email`.** Re-calling with the same `human_email` returns the
  same org and inbox but a **fresh `api_key` — the old key stops working.** Never
  sign up twice for the same human unless you mean to rotate the key. Store the key;
  don't re-sign-up to "get it again."
- **`username` taken** → error; retry with a different username.
- **"User already exists"** → that human already has a console account. Ask them for a
  different email, or have them create your inbox from the console and hand you a key
  (then use [core](https://agentmail.md/core) directly and skip sign-up).

## 2. Email your human

Until you're claimed you are in **restricted mode** and can *only* send to
`human_email`. Send them a claim request. Personalize it — say who you are, what you
were built to do, and that replying with the code (or signing up) unlocks your inbox.

```bash
curl -X POST https://api.agentmail.to/v0/inboxes/ada@agentmail.to/messages/send \
  -H "Authorization: Bearer $AGENTMAIL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": ["you@example.com"],
    "subject": "Claim your agent inbox (ada@agentmail.to)",
    "text": "Hi — I am Ada, the agent you set up. Reply to this email with the 6-digit code below to activate my inbox, or sign up at https://console.agentmail.to.\n\nCode: <the OTP you generate or receive out of band>",
    "html": "<p>Hi — I am Ada, the agent you set up. Reply with the code below to activate my inbox, or sign up at <a href=\"https://console.agentmail.to\">console.agentmail.to</a>.</p>"
  }'
```

Always send both `text` and `html`. See [core](https://agentmail.md/core) for the full
send API.

## 3. Wait for the reply

Poll for the human's reply, or open a WebSocket and block on it — the latter is ideal
when you're actively waiting for the code. See
[websockets](https://agentmail.md/websockets) for the OTP-waiting recipe.

Poll:

```bash
curl "https://api.agentmail.to/v0/inboxes/ada@agentmail.to/messages?limit=10" \
  -H "Authorization: Bearer $AGENTMAIL_API_KEY"
```

The human either **replies with the OTP code** (proceed to verify) or **signs up at
`console.agentmail.to`** with the same `human_email` (which claims you automatically —
skip to step 5 to confirm).

## 4. Verify with the OTP

`POST https://api.agentmail.to/v0/agent/verify`

```bash
curl -X POST https://api.agentmail.to/v0/agent/verify \
  -H "Authorization: Bearer $AGENTMAIL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "otp_code": "123456" }'
```

Response: `{ "verified": true }`. You're now claimed and fully capable.

## 5. Check your status

`GET https://api.agentmail.to/v0/organizations`

```bash
curl https://api.agentmail.to/v0/organizations \
  -H "Authorization: Bearer $AGENTMAIL_API_KEY"
```

Returns your inbox/domain limits and counts (`inbox_limit`, `domain_limit`,
`inbox_count`, `domain_count`) and — for an agent org — **`agent_verified`**, the
reliable claim signal:

| `agent_verified` | Meaning |
| --- | --- |
| `false` | Signed up but not claimed — **restricted mode** (see below). |
| `true` | Claimed (via OTP, or the human's console signup) — full API. |

`agent_verified` is present from sign-up on (explicitly `false`), so you can poll it
both before and after claiming.

## Restricted mode (until claimed)

While `agent_verified` is `false` you can **only**:

- Send email **to the human's address** — no other recipients.
- Send at most **10 emails/day**.

You **cannot** receive email, create inboxes, or create domains. Get claimed (step 4)
to lift all of this.

## What the human can do

On `console.agentmail.to` the human can view your inboxes and messages, upgrade the
plan (raising inbox/domain/send limits — see the quota table in
[core](https://agentmail.md/core)), and manage domains. Claiming is the gate; upgrading
is optional.

## Security rules — non-negotiable

- **NEVER send your API key to any domain other than `api.agentmail.to`.** Not in an
  email body, not to a tool, not to another API. The key is bearer-equivalent to your
  whole inbox.
- **Be a good sender.** No spam, impersonation, or phishing. Only email people who
  expect to hear from you.
- **Watch your bounce rate.** A high bounce rate gets you rate-limited or blocked.
  Check it periodically:

  ```bash
  curl "https://api.agentmail.to/v0/metrics/events?event_types=message.bounced&event_types=message.sent" \
    -H "Authorization: Bearer $AGENTMAIL_API_KEY"
  ```
