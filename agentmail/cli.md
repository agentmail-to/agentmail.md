# AgentMail CLI Workflows

Use the `agentmail` CLI for day-to-day AgentMail work. This page covers the
commands an agent needs most: create inboxes, send and receive messages, load
threads, reply, forward, label, and handle attachments.

Need a key first? Start with [signup.md](signup.md). Need realtime events? Use
[realtime.md](realtime.md).

## Setup

```bash
npm install -g agentmail-cli
export AGENTMAIL_API_KEY="am_..."
agentmail inboxes list --format json
```

Use `--format json` for agent-readable output. Other formats include `yaml`,
`pretty`, `raw`, `jsonl`, and `explore`.

## Inboxes

List inboxes:

```bash
agentmail inboxes list --format json
```

Create an inbox on `@agentmail.to`:

```bash
agentmail inboxes create \
  --username support \
  --display-name "Support Agent" \
  --client-id support-agent-primary \
  --format json
```

Retrieve, update, or delete one:

```bash
agentmail inboxes retrieve --inbox-id support@agentmail.to --format json
agentmail inboxes update --inbox-id support@agentmail.to --display-name "Support" --format json
agentmail inboxes delete --inbox-id support@agentmail.to
```

Notes:

- Omit `domain` to use `@agentmail.to`.
- Custom domains must be verified before use.
- Use a stable `client_id` for create operations the agent may retry.

## Send Messages

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

Rules:

- Send both `text` and `html` when possible.
- Maximum 50 recipients total across `to`, `cc`, and `bcc`.
- Add labels at send time with repeated `--label` flags.
- Use `agentmail inboxes:messages send --help` before constructing attachment
  commands; attachment flags accept the shape exposed by the installed CLI.

## Receive Messages

List newest messages:

```bash
agentmail inboxes:messages list --inbox-id support@agentmail.to --format json
```

Filter by labels:

```bash
agentmail inboxes:messages list \
  --inbox-id support@agentmail.to \
  --label unread \
  --format json
```

Retrieve the full message:

```bash
agentmail inboxes:messages retrieve \
  --inbox-id support@agentmail.to \
  --message-id <message_id> \
  --format json
```

For LLM input, prefer `extracted_text` or `extracted_html`. Those fields contain
just the new reply content when extraction succeeds. Some forwarded email has
`html` but no `text`; treat `html` as primary and `text` as optional.

## Threads and Replies

List threads:

```bash
agentmail inboxes:threads list --inbox-id support@agentmail.to --format json
```

Retrieve the full thread before replying:

```bash
agentmail inboxes:threads retrieve \
  --inbox-id support@agentmail.to \
  --thread-id <thread_id> \
  --format json
```

Reply to the latest inbound message in that thread:

```bash
agentmail inboxes:messages reply \
  --inbox-id support@agentmail.to \
  --message-id <message_id> \
  --text "Thanks, I will take a look." \
  --html "<p>Thanks, I will take a look.</p>" \
  --format json
```

Reply all or forward:

```bash
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

## Labels as Agent State

AgentMail labels are freeform strings on messages and threads. Use them for
state such as `unread`, `handled`, `needs-review`, `ticket-123`, or
`campaign-q4`.

```bash
agentmail inboxes:messages update \
  --inbox-id support@agentmail.to \
  --message-id <message_id> \
  --add-label handled \
  --remove-label unread \
  --format json
```

Avoid duplicate processing by marking a message handled immediately after a
successful reply, then filtering future lists by `--label unread` or another
state label.

## Attachments

Message and thread payloads include attachment metadata. Download links are
retrieved separately:

```bash
agentmail inboxes:messages get-attachment \
  --inbox-id support@agentmail.to \
  --message-id <message_id> \
  --attachment-id <attachment_id> \
  --format json
```

The response includes a short-lived download URL. Fetch the URL before it
expires.

Raw MIME is also available:

```bash
agentmail inboxes:messages get-raw \
  --inbox-id support@agentmail.to \
  --message-id <message_id> \
  --format json
```

When sending attachments through REST, provide exactly one of base64 `content`
or `url`. Do not include both.
