// Build a local copy of the site — the same pages, adapted for offline use as a
// plain folder of .md files:
//   - https://agentmail.md/... links  ->  relative file paths (core.md, llms.txt)
//   - the signup `referrer` value (agentmail.md on the web) is set from --referrer
// agentmail.to links (the API and docs) are left untouched.
//
// Run: `npm run build:local -- [--out=local] [--referrer=<value>]`
//   or: `node scripts/build-local.js [--out=local] [--referrer=<value>]`  (needs public/)

import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "public"); // the web build

const args = process.argv.slice(2);
const flag = (name, def) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : def;
};
const OUT = join(ROOT, flag("out", "local"));
const REFERRER = flag("referrer", "agentmail.md");

if (!existsSync(SRC)) {
  console.error("public/ not found — run `npm run build` first (or use `npm run build:local`).");
  process.exit(1);
}

// Left out of the local skill package: web-only artifacts, plus index.md — its
// body is SKILL.md's body, so SKILL.md (with frontmatter) supersedes it offline.
const SKIP = new Set(["sitemap.xml", "robots.txt", "index.md"]);

// Rewrite absolute agentmail.md links to relative local file paths.
function toLocalLinks(content) {
  return content.replace(/https:\/\/agentmail\.md(\/[A-Za-z0-9._\/-]*)?/g, (_, rest) => {
    if (rest == null) return "."; // bare domain
    const path = rest.slice(1); // strip leading slash
    if (path === "") return "SKILL.md"; // site root -> the skill entry point
    if (/\.(md|txt|xml)$/.test(path)) return path; // already a filename
    return `${path}.md`; // extensionless slug -> file
  });
}

// After the URLs are gone, the only remaining bare `agentmail.md` is the referrer
// value — set it to the caller's --referrer.
function setReferrer(content) {
  return content.replaceAll("agentmail.md", REFERRER);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const files = readdirSync(SRC).filter((f) => !SKIP.has(f));
for (const f of files) {
  let content = readFileSync(join(SRC, f), "utf8");
  content = toLocalLinks(content);
  content = setReferrer(content);
  writeFileSync(join(OUT, f), content);
}

console.log(`Exported ${files.length} files to ${OUT} (referrer: ${REFERRER}):`);
for (const f of files) console.log(`  ${f}`);
