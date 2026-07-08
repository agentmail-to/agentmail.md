// Build step: publish the canonical AgentMail skill package from ./agentmail
// into ./public, plus machine-readable discovery files.
//
// Run: `npm run build`  (or `node scripts/build.js`)

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "agentmail");
const SITE = join(ROOT, "site");
const OUT = join(ROOT, "public");
const MANIFEST_FILE = join(SRC, "manifest.json");
const SITE_INDEX_FILE = join(SITE, "index.md");

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { data: {}, body: raw, hasFrontmatter: false };

  const data = {};
  for (const line of match[1].split("\n")) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    data[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }

  return { data, body: raw.slice(match[0].length), hasFrontmatter: true };
}

function readPages(manifest) {
  const seen = new Set();
  const pages = manifest.pages.map((entry, index) => {
    if (!entry.file || !entry.file.endsWith(".md")) throw new Error("Every page entry needs a .md file");
    if (!entry.title) throw new Error(`${entry.file}: missing title in manifest`);
    if (!entry.description) throw new Error(`${entry.file}: missing description in manifest`);
    if (seen.has(entry.file)) throw new Error(`${entry.file}: duplicate manifest entry`);
    seen.add(entry.file);

    const source = join(SRC, entry.file);
    if (!existsSync(source)) throw new Error(`${entry.file}: listed in manifest but missing from agentmail/`);

    const raw = readFileSync(source, "utf8");
    if (!raw.trim()) throw new Error(`${entry.file}: empty markdown file`);

    return {
      ...entry,
      index,
      raw: raw.trimEnd() + "\n",
      slug: basename(entry.file, ".md"),
      url: `${manifest.baseUrl}/${entry.file}`,
    };
  });

  const skill = pages.find((page) => page.file === "SKILL.md");
  if (!skill) throw new Error("manifest must include SKILL.md");

  for (const file of readdirSync(SRC).filter((f) => f.endsWith(".md"))) {
    if (!seen.has(file)) throw new Error(`${file}: markdown file exists but is missing from manifest`);
  }

  const skillFrontmatter = parseFrontmatter(skill.raw);
  if (!skillFrontmatter.hasFrontmatter) throw new Error("SKILL.md needs skill frontmatter");
  if (skillFrontmatter.data.name !== "agentmail") throw new Error("SKILL.md frontmatter name must be agentmail");
  if (skillFrontmatter.data.description !== skill.description) {
    throw new Error("SKILL.md frontmatter description must match manifest description");
  }

  return pages;
}

function readSitePages() {
  if (!existsSync(SITE_INDEX_FILE)) throw new Error("site/index.md is missing");

  const seen = new Set();
  return readdirSync(SITE)
    .filter((file) => file.endsWith(".md"))
    .sort((a, b) => (a === "index.md" ? -1 : b === "index.md" ? 1 : a.localeCompare(b)))
    .map((file) => {
      if (seen.has(file)) throw new Error(`site/${file}: duplicate site file`);
      seen.add(file);

      const raw = readFileSync(join(SITE, file), "utf8");
      if (!raw.trim()) throw new Error(`site/${file}: empty markdown file`);
      return { file, raw: raw.trimEnd() + "\n", url: `${manifest.baseUrl}/${file}` };
    });
}

function normalizeHostedPath(path) {
  if (path === "" || path === "/") return "index.md";

  const stripped = path.startsWith("/") ? path.slice(1) : path;
  if (stripped === "") return "index.md";
  if (stripped.endsWith("/")) return `${stripped.slice(0, -1)}.md`;
  if (/\.[A-Za-z0-9]+$/.test(stripped)) return stripped;
  return `${stripped}.md`;
}

function validateSkillLinks(file, raw, allowedRelativeTargets) {
  for (const match of raw.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1].split("#")[0];
    if (!target || /^(https?:|mailto:)/.test(target)) continue;
    if (target.startsWith("/")) throw new Error(`${file}: use sibling links, not root paths: ${match[1]}`);
    if (target.includes("/")) throw new Error(`${file}: avoid path prefixes in local links: ${match[1]}`);
    if (!allowedRelativeTargets.has(target)) throw new Error(`${file}: missing relative link target ${match[1]}`);
  }
}

function validateWebsiteLinks(file, raw, manifest, allowedHostedTargets) {
  for (const match of raw.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1].split("#")[0];
    if (!target || /^mailto:/.test(target)) continue;

    if (target.startsWith(manifest.baseUrl)) {
      const path = target.slice(manifest.baseUrl.length);
      const normalized = normalizeHostedPath(path);
      if (!allowedHostedTargets.has(normalized)) {
        throw new Error(`${file}: hosted URL does not resolve to generated file: ${match[1]}`);
      }
      continue;
    }

    if (/^https?:/.test(target)) continue;

    throw new Error(`${file}: website links must be absolute URLs: ${match[1]}`);
  }
}

function toHostedLinks(raw, manifest, allowedRelativeTargets) {
  return raw.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (full, label, target) => {
    const [path, hash = ""] = target.split("#");
    if (!path || /^(https?:|mailto:)/.test(path)) return full;
    if (path.startsWith("/") || path.includes("/") || !allowedRelativeTargets.has(path)) return full;

    const suffix = hash ? `#${hash}` : "";
    return `[${label}](${manifest.baseUrl}/${path}${suffix})`;
  });
}

function buildLlms(manifest, pages) {
  const skill = pages.find((page) => page.file === "SKILL.md");
  const references = pages
    .filter((page) => page.file !== "SKILL.md")
    .map((page) => `- [${page.title}](${page.url}): ${page.description}`)
    .join("\n");

  return `# ${manifest.title}

> ${manifest.tagline}

## Skill

- [${skill.title}](${skill.url}): ${skill.description}

## Reference Files

${references}
`;
}

function buildLlmsFull(manifest, pages) {
  const sections = pages
    .map((page) => `<!-- ${page.url} -->\n\n${page.raw.trim()}`)
    .join("\n\n---\n\n");

  return `# ${manifest.title} - full text

> ${manifest.tagline}
> Source: ${manifest.baseUrl}

---

${sections}
`;
}

function buildSitemap(manifest, pages, sitePages) {
  const siteUrls = sitePages
    .filter((page) => page.file !== "index.md")
    .map((page) => page.url);
  const locs = [`${manifest.baseUrl}/`, ...pages.map((page) => page.url), ...siteUrls];
  const urls = locs.map((loc) => `  <url>\n    <loc>${loc}</loc>\n  </url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function buildRobots(manifest) {
  return `User-agent: *
Allow: /

Sitemap: ${manifest.baseUrl}/sitemap.xml
`;
}

const manifest = readJson(MANIFEST_FILE);
if (!manifest.title) throw new Error("manifest missing title");
if (!manifest.tagline) throw new Error("manifest missing tagline");
if (!manifest.baseUrl) throw new Error("manifest missing baseUrl");

const pages = readPages(manifest);
const sitePages = readSitePages();
const pageFiles = new Set(pages.map((page) => page.file));
const siteFiles = new Set(sitePages.map((page) => page.file));
for (const file of siteFiles) {
  if (pageFiles.has(file)) throw new Error(`site/${file} conflicts with agentmail/${file}`);
}
const skillAllowedTargets = new Set(pageFiles);
const siteAllowedTargets = new Set([...pageFiles, ...siteFiles, "llms.txt", "llms-full.txt"]);

for (const page of pages) validateSkillLinks(`agentmail/${page.file}`, page.raw, skillAllowedTargets);
for (const page of sitePages) validateWebsiteLinks(`site/${page.file}`, page.raw, manifest, siteAllowedTargets);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

for (const page of sitePages) {
  writeFileSync(join(OUT, page.file), page.raw);
}

const hostedPages = pages.map((page) => ({
  ...page,
  raw: toHostedLinks(page.raw, manifest, skillAllowedTargets),
}));

for (const page of hostedPages) {
  writeFileSync(join(OUT, page.file), page.raw);
}

writeFileSync(join(OUT, "llms.txt"), buildLlms(manifest, pages));
writeFileSync(join(OUT, "llms-full.txt"), buildLlmsFull(manifest, hostedPages));
writeFileSync(join(OUT, "sitemap.xml"), buildSitemap(manifest, pages, sitePages));
writeFileSync(join(OUT, "robots.txt"), buildRobots(manifest));

console.log(`Copied ${pages.length} skill files from agentmail/ into public/`);
for (const page of sitePages) console.log(`  ${page.file} - Website page`);
for (const page of pages) console.log(`  ${page.file} - ${page.title}`);
