# AgentMail Self-Signup

Use this when the agent does not have an AgentMail API key. A human must receive
and provide the OTP.

## Sign Up

```bash
npm install -g agentmail-cli@latest
agentmail agent sign-up \
  --human-email you@example.com \
  --username my-agent \
  --source agentmail-cli \
  --referrer agentmail.md \
  --format json
```

Export the returned `api_key`:

```bash
export AGENTMAIL_API_KEY="am_..."
```

Verify with the OTP:

```bash
agentmail agent verify --otp-code 123456
```

## Notes

- Use a real human email address for `--human-email`.
- Signing up again with the same `--human-email` is destructive: it rotates
  the API key and invalidates the old one. Do not re-run sign-up for an
  existing agent unless you intend to revoke its current key.
- Before verification, the account is limited (currently one inbox, 10
  sends/day, sends restricted to the signup human email); these limits are
  plan-dependent and may change.

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
