# agentmail.md

This repo publishes CLI-first AgentMail skill markdown for coding agents. The
canonical authored package lives in `agentmail/`, and the generated hosted output
lives in `public/`.

The authored package stays runtime-neutral. Target-specific exports, such as the
later Hermes `skills/email/agentmail/` package, are generated from overlays.

## Layout

```text
agentmail/
  SKILL.md       Main skill entry point
  core.md        Inbox, message, thread, label, and attachment workflows
  signup.md      CLI self-signup and OTP verification
  webhooks.md    Public HTTPS webhook delivery guidance
  websockets.md  Local realtime WebSocket delivery guidance
  mcp.md         MCP integration guidance
  manifest.json  Hosted index metadata
site/
  index.md       Website landing page served at /
scripts/
  build.js       Copies agentmail/ into public/ and generates indexes
  build-local.js Exports a local skill package
  build-hermes.js Exports a Hermes skill package
targets/
  hermes/
    frontmatter.yaml Hermes-only SKILL.md frontmatter overlay
public/          Generated hosted output
local/           Generated local package
dist/            Generated target-specific packages
```

`agentmail/SKILL.md` is the source of truth for the skill entry point. Supporting
files should stay terse, operational, and agent-oriented. `site/*.md` files are
website pages and should link to hosted files with absolute
`https://agentmail.md/...` URLs, without `agentmail/` path prefixes.

## Build

```bash
npm run build
```

This writes `public/`:

| Output | Source | Purpose |
| --- | --- | --- |
| `SKILL.md`, `*.md` | generated from `agentmail/` with absolute hosted links | hosted skill package |
| `index.md` | copied from `site/` | website landing page |
| `llms.txt` | generated from `manifest.json` | discovery index |
| `llms-full.txt` | generated from `manifest.json` and markdown files | one-file full reference |
| `sitemap.xml`, `robots.txt` | generated | crawler support |

Vercel serves `/` from `index.md`; extensionless paths such as `/core` are
rewritten to `/core.md`. Hosted markdown uses absolute `https://agentmail.md/...`
links. The canonical `agentmail/` source uses relative links so it remains
copyable into agent runtimes.

## Local Export

```bash
npm run build:local
```

This runs the hosted build, then writes `local/` as a self-contained skill
package. Website pages from `site/` are omitted; `SKILL.md` is the package entry
point. Links to `https://agentmail.md/<file>` become relative file links, and
the self-signup `--referrer agentmail.md` value can be changed:

```bash
npm run build:local -- --referrer=hermes-agent --out=local
```

External AgentMail links such as `https://agentmail.to`,
`https://console.agentmail.to`, and `https://docs.agentmail.to` are left as
URLs.

## Hermes Export

```bash
npm run build:hermes
```

This writes `dist/hermes/skills/email/agentmail/`. It copies the neutral
`agentmail/*.md` files, replaces only `SKILL.md` frontmatter with
`targets/hermes/frontmatter.yaml`, moves supporting files to `references/`, and
changes the self-signup referrer to `hermes-agent`.

Use that generated folder for the later Hermes PR. Do not put Hermes metadata in
the neutral authored files or hosted website output.

## Editing

1. Edit skill files under `agentmail/`.
2. Edit website pages in `site/`.
3. Update `agentmail/manifest.json` when adding, removing, renaming, or
   reordering files.
4. Update target overlays under `targets/` only when a target runtime needs
   target-specific metadata.
5. Run `npm run build:local` and `npm run build:hermes`.
6. Review generated `public/`, `local/`, and `dist/hermes/`.

Do not edit generated files by hand.

## Deploy

Push to GitHub and let Vercel run `npm run build`, or run:

```bash
npx vercel --prod
```
