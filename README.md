# agentmail.md

A static site that serves **AgentMail skills** as raw markdown, so an AI agent
can fetch a skill and drop it straight into its context. Clean, extensionless
URLs.

```bash
curl https://agentmail.md/core
```

## Layout

```
index.md         Landing page (served at /) — hand-written, not indexed
<name>.md        Indexed pages — root-level, with YAML frontmatter (see below)
pages.json       Manifest — page order + display titles (presentation metadata)
scripts/build.js Build step — copies pages, generates the machine files
vercel.json      Routing + headers
public/          Generated output (gitignored) — what actually gets served
```

Two kinds of content, distinguished by **whether the file has frontmatter**:

- **Indexed pages** — a root `.md` file *with* a YAML frontmatter block. These are
  the source of truth for the machine-readable outputs (`llms.txt`, `sitemap.xml`).
  Today they're all skills, but any page type works — frontmatter means "index me,"
  not "I'm a skill."
- **Unindexed pages** — a root `.md` file *without* frontmatter (e.g. `index.md`).
  Copied through untouched; never listed in the machine files. Add an `about.md`
  the same way — no config needed.

(`README.md` is the one exception: it's repo docs, not served.)

## Frontmatter

Each indexed page starts with a YAML block (Anthropic `SKILL.md`–compatible) holding
just the metadata intrinsic to the page:

```yaml
---
name: core          # slug; must match the filename stem and the URL (/core)
description: ...     # what it does + when to use it — agents match on this
---
```

Both fields are required. **Presentation metadata lives in `pages.json`, not here** —
that keeps `title`/`order` out of every file and in one place.

## Manifest (`pages.json`)

An ordered list of the indexed pages. A page's **order is its position in the array**
(reorder = move a line), its display **title** is the `title` field, and `related`
(optional) is a list of slugs rendered as a `**Related:**` nav footer on that page's
served copy (absolute links, so navigation survives the page being fetched alone):

```json
[
  { "slug": "signup", "title": "Sign up",  "related": ["core"] },
  { "slug": "core",   "title": "Core API", "related": ["signup", "webhooks", "websockets"] }
]
```

A page file not listed here still builds — it's appended last with its slug as the
title (with a warning). A manifest entry with no matching `.md` file — or a `related`
slug that isn't an indexed page — is an error.

## Build

`npm run build` runs `scripts/build.js`, which writes `./public`:

| Output | Source | Purpose |
| --- | --- | --- |
| `index.md`, `<name>.md` | copied (indexed pages get a `**Related:**` footer) | the landing page + each indexed page |
| `llms.txt` | generated from indexed pages | [llms.txt](https://llmstxt.org) discovery index for LLM tooling |
| `llms-full.txt` | generated from indexed pages | every page concatenated — one fetch for all of it |
| `sitemap.xml` | root + indexed pages | for search-engine crawlers |
| `robots.txt` | generated | allow-all + points to the sitemap |

Local preview: `npm run build` then serve `public/` with any static server
(e.g. `npx serve public`).

## Routing

`vercel.json` maps requests to files in `public/`:

| Request | Serves |
| --- | --- |
| `/` | `index.md` |
| `/core` | `core.md` |
| `/core.md` | `core.md` |
| `/llms.txt`, `/sitemap.xml` | served as-is (real files win over the rewrite) |

Responses get `Access-Control-Allow-Origin: *`; Vercel serves each file by its
natural content type (`.md` → markdown, `.xml` → xml, `.txt` → text).

## Adding a page

1. Create `<name>.md` at the repo root with the frontmatter above.
2. Add an entry to `pages.json` at the position you want it ordered.
3. If it should be surfaced on the landing page, add a blurb + link to `index.md`
   (that page is hand-maintained).
4. Commit. Vercel runs `npm run build` on deploy — `llms.txt`, `llms-full.txt`,
   and `sitemap.xml` regenerate automatically.

## Deploy — Vercel

1. Push to GitHub.
2. Vercel → **Add New → Project**, import the repo. `vercel.json` already sets
   the build command (`npm run build`) and output directory (`public`).
3. Add the domain `agentmail.md` under **Settings → Domains**.

Or from the CLI: `npx vercel --prod`.
