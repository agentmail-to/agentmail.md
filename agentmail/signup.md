# AgentMail Self-Signup

Use this when the agent does not have an AgentMail API key. A human still has to
receive and provide the OTP.

## Sign Up

```bash
npm install -g agentmail-cli
agentmail agent sign-up \
  --human-email you@example.com \
  --username my-agent \
  --source agentmail-cli \
  --referrer agentmail.md \
  --format json
```

Save `api_key` and export it:

```bash
export AGENTMAIL_API_KEY="am_..."
```

Verify with the OTP sent to the human email:

```bash
agentmail agent verify --otp-code 123456
```

## Rules

- Use a real human email address; placeholder domains may be rejected.
- `human_email` is the signup idempotency key, but signing up again with the
  same email rotates the API key.
- Before verification, the account has one inbox, 10 sends/day, and can only
  send to the signup human email.
- If the human already has a console account, use a different email or have them
  create an API key in `https://console.agentmail.to`.

## First Check

```bash
agentmail inboxes list --format json
agentmail inboxes:messages send \
  --inbox-id my-agent@agentmail.to \
  --to you@example.com \
  --subject "AgentMail verified" \
  --text "My AgentMail inbox is verified." \
  --format json
```

Continue with [core.md](core.md).
