// Build a local copy of the AgentMail skill package adapted for offline use as
// a plain folder of .md files:
//   - https://agentmail.md/<file> links  ->  relative file paths (core.md, llms.txt)
//   - the signup `--referrer agentmail.md` value is set from --referrer
// External AgentMail links are left untouched.
//
// Run: `npm run build:local -- [--out=local] [--referrer=<value>]`
//   or: `node scripts/build-local.js [--out=local] [--referrer=<value>]`  (needs public/)

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "public"); // the web build
const MANIFEST_FILE = join(ROOT, "agentmail", "manifest.json");

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

const MANIFEST = JSON.parse(readFileSync(MANIFEST_FILE, "utf8"));
const LOCAL_FILES = [...MANIFEST.pages.map((page) => page.file), "llms-full.txt", "llms.txt"];

// Rewrite generated absolute file links to relative local file paths.
function toLocalLinks(content) {
  return content.replace(/https:\/\/agentmail\.md(\/[A-Za-z0-9._\/-]*)?/g, (_, rest) => {
    if (rest == null || rest === "" || rest === "/") return "https://agentmail.md";
    const path = rest.slice(1); // strip leading slash
    if (/\.(md|txt|xml)$/.test(path)) return path; // already a filename
    return `${path}.md`; // extensionless slug -> file
  });
}

// Set only the signup referrer value; do not rewrite the hosted reference URL.
function setReferrer(content) {
  return content.replaceAll("--referrer agentmail.md", `--referrer ${REFERRER}`);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

for (const f of LOCAL_FILES) {
  let content = readFileSync(join(SRC, f), "utf8");
  content = toLocalLinks(content);
  content = setReferrer(content);
  writeFileSync(join(OUT, f), content);
}

console.log(`Exported ${LOCAL_FILES.length} files to ${OUT} (referrer: ${REFERRER}):`);
for (const f of LOCAL_FILES) console.log(`  ${f}`);
