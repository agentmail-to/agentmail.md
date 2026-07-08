// Export the neutral AgentMail markdown as a Hermes-ready skill package.
//
// The authored files in ./agentmail stay runtime-neutral for agentmail.md.
// This build overlays Hermes-specific SKILL.md frontmatter only in the export.
//
// Run: `npm run build:hermes`
//   or: `node scripts/build-hermes.js [--out=dist/hermes] [--referrer=hermes-agent]`

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "agentmail");
const MANIFEST_FILE = join(SRC, "manifest.json");
const FRONTMATTER_FILE = join(ROOT, "targets", "hermes", "frontmatter.yaml");

const args = process.argv.slice(2);
const flag = (name, def) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : def;
};

const OUT_ROOT = join(ROOT, flag("out", "dist/hermes"));
const OUT = join(OUT_ROOT, "skills", "email", "agentmail");
const REFERRER = flag("referrer", "hermes-agent");

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { body: raw, hasFrontmatter: false };
  return { body: raw.slice(match[0].length), hasFrontmatter: true };
}

function readYamlScalar(yaml, key) {
  const match = yaml.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : "";
}

function overlaySkillFrontmatter(raw, frontmatter) {
  const parsed = parseFrontmatter(raw);
  if (!parsed.hasFrontmatter) throw new Error("agentmail/SKILL.md needs frontmatter");
  return `---\n${frontmatter.trim()}\n---\n\n${parsed.body.trimStart()}`;
}

function setReferrer(content) {
  return content.replaceAll("--referrer agentmail.md", `--referrer ${REFERRER}`);
}

function toHermesSkillLinks(content, referenceFiles) {
  return content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (full, label, target) => {
    const [path, hash = ""] = target.split("#");
    if (!path || /^(https?:|mailto:)/.test(path)) return full;
    if (path.startsWith("/") || path.includes("/") || !referenceFiles.has(path)) return full;

    const suffix = hash ? `#${hash}` : "";
    return `[${label}](references/${path}${suffix})`;
  });
}

function validateRelativeLinks(file, content, allowedTargets) {
  for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1].split("#")[0];
    if (!target || /^(https?:|mailto:)/.test(target)) continue;
    if (target.startsWith("/") || !allowedTargets.has(target)) {
      throw new Error(`${file}: bad relative link ${match[1]}`);
    }
  }
}

if (!existsSync(FRONTMATTER_FILE)) {
  throw new Error("targets/hermes/frontmatter.yaml is missing");
}

const manifest = JSON.parse(readFileSync(MANIFEST_FILE, "utf8"));
const frontmatter = readFileSync(FRONTMATTER_FILE, "utf8").trimEnd();
const name = readYamlScalar(frontmatter, "name");
const description = readYamlScalar(frontmatter, "description");
if (name !== "agentmail") throw new Error("Hermes frontmatter name must be agentmail");
if (!description.startsWith("Use when ")) {
  throw new Error('Hermes frontmatter description should start with "Use when "');
}
for (const required of ["version:", "author:", "license:", "metadata:", "hermes:", "tags:", "homepage:", "prerequisites:", "commands:"]) {
  if (!frontmatter.includes(required)) throw new Error(`Hermes frontmatter missing ${required}`);
}

const files = manifest.pages.map((page) => page.file);
const referenceFiles = new Set(files.filter((file) => file !== "SKILL.md"));
const skillLinkTargets = new Set([...referenceFiles].map((file) => `references/${file}`));

rmSync(OUT_ROOT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

for (const file of files) {
  const srcFile = join(SRC, file);
  const outFile = file === "SKILL.md" ? join(OUT, file) : join(OUT, "references", file);
  if (!existsSync(srcFile)) throw new Error(`${file}: listed in manifest but missing`);

  let content = readFileSync(srcFile, "utf8").trimEnd() + "\n";
  if (file === "SKILL.md") {
    content = overlaySkillFrontmatter(content, frontmatter);
    content = toHermesSkillLinks(content, referenceFiles);
    validateRelativeLinks(file, content, skillLinkTargets);
  } else {
    validateRelativeLinks(file, content, referenceFiles);
  }
  content = setReferrer(content);

  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, content);
}

console.log(`Exported Hermes skill package to ${OUT} (referrer: ${REFERRER}):`);
console.log("  SKILL.md");
for (const file of referenceFiles) console.log(`  references/${file}`);
