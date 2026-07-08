# AgentMail Self-Signup

Use this when the agent does not have an AgentMail API key. The `agentmail` CLI
can create an agent organization, one inbox, and an API key without a human using
the console first. A human still has to verify ownership with a 6-digit OTP.

## Install

```bash
npm install -g agentmail-cli
agentmail --help
```

The self-signup commands are `agentmail agent sign-up` and
`agentmail agent verify`. If `agentmail agent --help` is missing, update the CLI
before falling back to REST or console-created keys.

## Sign Up

Use a real human email address. Placeholder domains such as `example.com` may be
rejected.

```bash
agentmail agent sign-up \
  --human-email you@example.com \
  --username my-agent \
  --source agentmail-cli \
  --referrer agentmail.md \
  --format json
```

Save the returned fields:

| Field | Use |
| --- | --- |
| `api_key` | Export as `AGENTMAIL_API_KEY`; it cannot be retrieved later. |
| `inbox_id` | The agent inbox ID, currently the email address. |
| `organization_id` | Useful for debugging and support. |

```bash
export AGENTMAIL_API_KEY="am_..."
```

Important behavior:

- `human_email` is the idempotency key for self-signup.
- Calling sign-up again with the same `human_email` rotates the API key.
- If the human already has a console account, use a different email or have the
  human create an API key in `https://console.agentmail.to`.
- The OTP is sent to the human email. Ask the human for the code, or have them
  create a console account with the same email to verify.

## Verify

```bash
agentmail agent verify --otp-code 123456
```

Verification upgrades the organization from restricted agent mode to the normal
free plan. The OTP expires after 24 hours and allows 10 attempts.

## Restricted Mode

Before verification:

- The agent can only send mail to the signup `human_email`.
- The agent cannot send to arbitrary recipients.
- The agent starts with 1 inbox and 10 sends/day.

Do not proceed to external outreach until `agentmail agent verify` succeeds.

## First Check

After verification, list inboxes and send a small test message:

```bash
agentmail inboxes list --format json
agentmail inboxes:messages send \
  --inbox-id my-agent@agentmail.to \
  --to you@example.com \
  --subject "AgentMail verified" \
  --text "My AgentMail inbox is verified." \
  --html "<p>My AgentMail inbox is verified.</p>" \
  --format json
```

Continue with [core.md](core.md) for inbox, message, thread, label, and attachment
workflows.
