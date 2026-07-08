# AgentMail Core

Use this for the common CLI path: create an inbox, send mail, read incoming
mail, reply in threads, label work, and fetch attachments.

Need a key first? Use [signup.md](signup.md). Need push or streaming delivery?
Use [webhooks.md](webhooks.md) or [websockets.md](websockets.md).

## Setup

```bash
npm install -g agentmail-cli
export AGENTMAIL_API_KEY="am_..."
agentmail inboxes list --format json
```

## Inboxes

```bash
agentmail inboxes create \
  --username support \
  --display-name "Support Agent" \
  --client-id support-agent-primary \
  --format json

agentmail inboxes retrieve --inbox-id support@agentmail.to --format json
```

Omit `domain` to use `@agentmail.to`. Custom domains must be verified first.
Use a stable `client_id` when a create command may be retried.

## Send

```bash
agentmail inboxes:messages send \
  --inbox-id support@agentmail.to \
  --to customer@example.com \
  --subject "Hello" \
  --text "Plain-text body." \
  --html "<p>Plain-text body.</p>" \
  --label outreach \
  --format json
```

Send both `text` and `html` when possible. Recipient limit is 50 total across
`to`, `cc`, and `bcc`.

## Read and Reply

```bash
agentmail inboxes:messages list --inbox-id support@agentmail.to --label unread --format json
agentmail inboxes:messages retrieve --inbox-id support@agentmail.to --message-id <message_id> --format json
agentmail inboxes:threads retrieve --inbox-id support@agentmail.to --thread-id <thread_id> --format json
```

For LLM input, prefer `extracted_text` or `extracted_html`. Some email has
`html` but no `text`.

```bash
agentmail inboxes:messages reply \
  --inbox-id support@agentmail.to \
  --message-id <message_id> \
  --text "Thanks, I will take a look." \
  --format json

agentmail inboxes:messages reply-all \
  --inbox-id support@agentmail.to \
  --message-id <message_id> \
  --text "Thanks, everyone." \
  --format json

agentmail inboxes:messages forward \
  --inbox-id support@agentmail.to \
  --message-id <message_id> \
  --to teammate@example.com \
  --format json
```

## Labels

Use labels as lightweight agent state, such as `unread`, `handled`, or
`needs-review`.

```bash
agentmail inboxes:messages update \
  --inbox-id support@agentmail.to \
  --message-id <message_id> \
  --add-label handled \
  --remove-label unread \
  --format json
```

## Attachments

```bash
agentmail inboxes:messages get-attachment \
  --inbox-id support@agentmail.to \
  --message-id <message_id> \
  --attachment-id <attachment_id> \
  --format json
```

Fetch the returned download URL before it expires. Use
`agentmail inboxes:messages send --help` before constructing attachment-send
commands.

## REST Notes

Use REST only when the CLI is unavailable or missing a required operation.

```bash
curl https://api.agentmail.to/v0/inboxes \
  -H "Authorization: Bearer $AGENTMAIL_API_KEY"
```

Base URL: `https://api.agentmail.to/v0`. EU region:
`https://api.agentmail.eu/v0`.

Error bodies include `name` and `message`; validation errors include `errors`.
For `429`, honor `Retry-After` and back off.
