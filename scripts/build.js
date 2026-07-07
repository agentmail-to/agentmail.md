// Build step: assemble the site into ./public.
//
// Pages with frontmatter (name + description) are indexed — they drive the
// machine-readable outputs (llms.txt, llms-full.txt, sitemap.xml). Pages without
// frontmatter (index.md, and any future about.md, ...) are copied through
// verbatim but not indexed. Zero dependencies.
//
// Run: `npm run build`  (or `node scripts/build.js`)

import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync } from "node:fs";
import { join, basename } from "node:path";

const ROOT = process.cwd();
const OUT = join(ROOT, "public");

const SITE = {
  baseUrl: "https://agentmail.md",
  title: "AgentMail Skills",
  tagline:
    "Markdown skills that teach an AI agent how to use [AgentMail](https://agentmail.to) — " +
    "the email inbox API for agents. Each skill is a raw markdown file you can fetch and " +
    "drop straight into an agent's context.",
};

// README.md is repo documentation, not part of the served site.
const NOT_SERVED = new Set(["README.md"]);

// Presentation metadata — display title + order — is centralized here instead of
// being repeated in each page's frontmatter. A page's order is its position in
// this array; its title is the `title` field. Pages omitted from the list are
// appended last with their slug as the title.
const MANIFEST = JSON.parse(readFileSync(join(ROOT, "pages.json"), "utf8"));
const META = new Map(MANIFEST.map((entry, i) => [entry.slug, { title: entry.title, order: i }]));

function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { data: {}, body: raw, hasFrontmatter: false };
  const data = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    data[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { data, body: raw.slice(m[0].length), hasFrontmatter: true };
}

// An indexed page is any served root .md that carries a frontmatter block. Pages
// without frontmatter (index.md and any future about.md, ...) are skipped here —
// but still copied to the output by the build step below.
function loadPages() {
  const pages = readdirSync(ROOT)
    .filter((f) => f.endsWith(".md") && !NOT_SERVED.has(f))
    .map((file) => ({ file, ...parseFrontmatter(readFileSync(join(ROOT, file), "utf8")) }))
    .filter((f) => f.hasFrontmatter)
    .map(({ file, data, body }) => {
      const slug = basename(file, ".md");
      if (!data.description) throw new Error(`${file}: missing 'description' in frontmatter`);
      const meta = META.get(slug);
      if (!meta) console.warn(`Warning: ${file} is not listed in pages.json — appended last, title = slug`);
      return {
        slug,
        file,
        body,
        title: meta?.title ?? slug,
        description: data.description,
        order: meta ? meta.order : Number.MAX_SAFE_INTEGER,
      };
    });

  // Catch a stale manifest: an entry with no corresponding page file.
  const found = new Set(pages.map((p) => p.slug));
  for (const { slug } of MANIFEST) {
    if (!found.has(slug)) throw new Error(`pages.json lists "${slug}" but ${slug}.md does not exist`);
  }

  return pages.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
}

const url = (slug) => `${SITE.baseUrl}/${slug}`;

// Spec: https://llmstxt.org — H1 + blockquote summary, then an H2 link-list section.
function buildLlms(pages) {
  const bullets = pages
    .map((p) => `- [${p.title}](${url(p.slug)}): ${p.description}`)
    .join("\n");
  return `# ${SITE.title}

> ${SITE.tagline}

## Pages

${bullets}
`;
}

function buildLlmsFull(pages) {
  const sections = pages
    .map((p) => `<!-- ${url(p.slug)} -->\n\n${p.body.trim()}`)
    .join("\n\n---\n\n");
  return `# ${SITE.title} — full text

> ${SITE.tagline}
> Source: ${SITE.baseUrl}

---

${sections}
`;
}

function buildSitemap(pages) {
  const locs = [`${SITE.baseUrl}/`, ...pages.map((p) => url(p.slug))];
  const urls = locs.map((loc) => `  <url>\n    <loc>${loc}</loc>\n  </url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function buildRobots() {
  return `User-agent: *
Allow: /

Sitemap: ${SITE.baseUrl}/sitemap.xml
`;
}

// --- build ---
const pages = loadPages();
if (pages.length === 0) throw new Error("No indexed .md pages found at repo root");

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// Copy all served markdown (indexed + curated pages) to the output root verbatim,
// so /<name> -> /<name>.md.
const served = readdirSync(ROOT).filter((f) => f.endsWith(".md") && !NOT_SERVED.has(f));
for (const f of served) writeFileSync(join(OUT, f), readFileSync(join(ROOT, f), "utf8"));

writeFileSync(join(OUT, "llms.txt"), buildLlms(pages));
writeFileSync(join(OUT, "llms-full.txt"), buildLlmsFull(pages));
writeFileSync(join(OUT, "sitemap.xml"), buildSitemap(pages));
writeFileSync(join(OUT, "robots.txt"), buildRobots());

console.log(`Copied ${served.length} pages; generated llms.txt, llms-full.txt, sitemap.xml, robots.txt into public/`);
for (const p of pages) console.log(`  ${p.slug} — ${p.title}`);
