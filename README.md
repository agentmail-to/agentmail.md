# agentmail.md

A static site that serves **AgentMail skills** as raw markdown, so an AI agent
can fetch a skill and drop it straight into its context. Clean, extensionless
URLs; no HTML, no build step, no serverless function.

```bash
curl https://agentmail.md/skills/example
```

## Layout

```
index.md      Served at /  — the skill index
skills/*.md   The skills — Anthropic skill format (name + description frontmatter)
vercel.json   Vercel routing + headers
```

## Routing

`vercel.json` maps requests to markdown files:

| Request | Serves |
| --- | --- |
| `/` | `index.md` |
| `/skills/example` | `skills/example.md` |
| `/skills/example.md` | `skills/example.md` |
| `/any/depth` | `any/depth.md` |

Responses are served as `text/markdown; charset=utf-8` with
`Access-Control-Allow-Origin: *`.

## Adding a skill

Drop a `skills/<name>.md` file (`name` + `description` frontmatter, then body)
and add a line to `index.md`. That's the whole workflow.

## Deploy — Vercel

Static assets + `vercel.json`. No build step, no function invoked — the rewrites
are handled at the routing layer.

1. Push this repo to GitHub.
2. Vercel → **Add New → Project**, import the repo. Framework preset: **Other**,
   no build command, output directory: root.
3. Add the domain `agentmail.md` under **Settings → Domains**.

Or from the CLI:

```bash
npx vercel --prod
```

Vercel serves `.md` as `text/markdown` and the `headers` block adds CORS; the
`rewrites` send `/` → `index.md` and any extensionless path → its `.md` file
(real files, including direct `*.md`, are matched first and served as-is).
