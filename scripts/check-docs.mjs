#!/usr/bin/env node
// Validates docs.json navigation against files on disk.
// Fails on: an empty navigation; pages referenced in docs.json that don't
// exist; .mdx files on disk that are neither in navigation nor in
// scripts/docs-allowlist.txt; redirect chains; and any URL in
// scripts/pre-restructure-urls.txt that no longer resolves.
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const docs = JSON.parse(readFileSync(join(ROOT, "docs.json"), "utf8"));

const pages = [];
function collect(node) {
  if (typeof node === "string") { pages.push(node); return; }
  if (Array.isArray(node)) { node.forEach(collect); return; }
  if (node && typeof node === "object") {
    if (node.pages) collect(node.pages);
    if (node.groups) collect(node.groups);
    if (node.tabs) collect(node.tabs);
    if (node.products) collect(node.products);
  }
}
collect(docs.navigation);
// A nav shape collect() doesn't know yields no pages; fail instead of
// reporting every file as an orphan.
if (!pages.length) {
  console.error("EMPTY NAV: docs.json navigation yielded 0 pages; teach collect() its shape.");
  process.exit(1);
}

const missing = pages.filter((p) => !existsSync(join(ROOT, `${p}.mdx`)));

const allowlistPath = join(ROOT, "scripts", "docs-allowlist.txt");
const allowlist = existsSync(allowlistPath)
  ? readFileSync(allowlistPath, "utf8").split("\n").map((s) => s.trim()).filter((s) => s && !s.startsWith("#"))
  : [];

const SKIP = new Set(["node_modules", ".git", "snippets", "docs", "scripts", "images", "logo", ".claude", ".worktrees"]);
const onDisk = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) { if (!SKIP.has(name)) walk(full); }
    else if (name.endsWith(".mdx")) onDisk.push(relative(ROOT, full).replace(/\.mdx$/, ""));
  }
}
walk(ROOT);

const referenced = new Set(pages);
const orphans = onDisk.filter((f) => !referenced.has(f) && !allowlist.includes(f));
const staleAllow = allowlist.filter((f) => !existsSync(join(ROOT, `${f}.mdx`)));

// --- Redirects and old URLs -------------------------------------------------
// A redirect must land on a real page, never on another redirect. Every URL
// snapshotted before the journey restructure must still resolve, directly or
// through exactly one redirect.
const redirectTo = new Map((docs.redirects || []).map((r) => [r.source, r.destination]));
const isPage = (url) => existsSync(join(ROOT, `${url.split("#")[0].replace(/^\//, "")}.mdx`));
const badRedirects = [...redirectTo].filter(([, to]) => redirectTo.has(to.split("#")[0]) || !isPage(to))
  .map(([from, to]) => `${from} -> ${to}`);
const urlsPath = join(ROOT, "scripts", "pre-restructure-urls.txt");
const oldUrls = existsSync(urlsPath)
  ? readFileSync(urlsPath, "utf8").split("\n").map((s) => s.trim()).filter((s) => s && !s.startsWith("#"))
  : [];
const unresolved = oldUrls.filter((u) => !isPage(u) && !(redirectTo.has(u) && isPage(redirectTo.get(u))));

// --- Python snippet health -------------------------------------------------
// Every ```python fence must parse. Fences tagged `python Signature` are
// deliberate pseudo-code (constructor / protocol shapes) and are skipped.
import { execFileSync } from "node:child_process";

const pyErrors = [];
const pyWarnings = [];
for (const rel of onDisk) {
  const text = readFileSync(join(ROOT, `${rel}.mdx`), "utf8");
  const re = /```python([^\n]*)\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const meta = m[1] || "";
    if (/Signature|Protocol/i.test(meta)) continue;
    const line = text.slice(0, m.index).split("\n").length;
    // dedent: strip the common leading whitespace (fences nested in <Tab> are indented)
    const raw = m[2].replace(/\s+$/, "").split("\n");
    const indents = raw.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length);
    const pad = indents.length ? Math.min(...indents) : 0;
    const code = raw.map((l) => l.slice(pad)).join("\n");
    try {
      execFileSync("python3", ["-c", "import ast,sys; ast.parse(sys.stdin.read())"], {
        input: code, stdio: ["pipe", "ignore", "pipe"],
      });
    } catch (e) {
      const msg = String(e.stderr || e.message).trim().split("\n").pop();
      pyErrors.push(`${rel}.mdx:${line} ${msg}`);
    }
    if (/\bos\./.test(code) && !/import os/.test(code)) {
      pyErrors.push(`${rel}.mdx:${line} uses os. without 'import os'`);
    }
    if (/api_key\s*=\s*["']sk_/.test(code)) {
      pyWarnings.push(`${rel}.mdx:${line} hardcoded sk_ key in a sample`);
    }
  }
}
if (pyErrors.length) console.error("PYTHON SNIPPET ERRORS:\n  " + pyErrors.join("\n  "));
if (pyWarnings.length) console.warn(`note: ${pyWarnings.length} snippet(s) hardcode an sk_ key; prefer AsyncClient() reading UNPOD_API_KEY`);

// --- Retired claims ---------------------------------------------------------
// Phrases the docs must not say again: retired positioning, and claims the
// product does not back. platform/ is frozen and exempt, except the apps
// moved under it (platform/apps/), which were checked before the move.
const RETIRED = [
  "tasks/create/",
  "in-house TTS",          // not on prod; speech is third-party
  "voice model router",    // the "router" is failover, not model selection
  "AWS SES",               // SES sends platform notifications, not agent email
  "one communication API", // no messages resource exists
  "live via provider",     // WhatsApp agent engine is on feature branches
  "partner access",        // LinkedIn: no implementation found
  "Context Graph", // renamed: Context Engine
  "core-engine/context-graph", // file renamed; link the new path
  "served at your inference endpoint", // no per-org SLM serving exists
  "5 lakh", // proof figure is now 10+ lakh interactions/month
  "Speech is solved", // contradicts the deck: channels are a hard layer
  "calling infra",          // retired positioning (also catches "calling infrastructure"); platform/ is exempt
  "Communication infra",
  "Transport layer", // layers are now Talk / Remember / Act
  "Execution layer",
  "Control layer",
  "four layers",
  "communication backend", // retired tagline: agentic backend for conversational AI
];
const retiredHits = [];
// snippets/ is skipped by the nav walk but renders inside pages, so scan it too.
const scanned = [...onDisk, ...readdirSync(join(ROOT, "snippets")).filter((n) => n.endsWith(".mdx")).map((n) => `snippets/${n.slice(0, -4)}`)];
for (const rel of scanned) {
  if (rel.startsWith("platform/") && !rel.startsWith("platform/apps/")) continue;
  readFileSync(join(ROOT, `${rel}.mdx`), "utf8").split("\n").forEach((line, i) => {
    const lower = line.toLowerCase();
    for (const phrase of RETIRED) {
      if (lower.includes(phrase.toLowerCase())) retiredHits.push(`${rel}.mdx:${i + 1} "${phrase}"`);
    }
  });
}
if (retiredHits.length) console.error("RETIRED CLAIMS:\n  " + retiredHits.join("\n  "));

if (missing.length) console.error("MISSING (in docs.json, not on disk):\n  " + missing.join("\n  "));
if (orphans.length) console.error("ORPHANS (on disk, not in nav or allowlist):\n  " + orphans.join("\n  "));
if (staleAllow.length) console.error("STALE ALLOWLIST (file no longer exists):\n  " + staleAllow.join("\n  "));
if (badRedirects.length) console.error("BAD REDIRECTS (chain or missing target):\n  " + badRedirects.join("\n  "));
if (unresolved.length) console.error("OLD URLS NO LONGER RESOLVE:\n  " + unresolved.join("\n  "));
if (allowlist.length) console.warn(`note: ${allowlist.length} file(s) on allowlist pending absorption`);
if (missing.length || orphans.length || staleAllow.length || pyErrors.length || retiredHits.length
  || badRedirects.length || unresolved.length) process.exit(1);
console.log(`OK: ${pages.length} nav pages, 0 missing, 0 unexplained orphans, all python fences parse, `
  + `${redirectTo.size} redirects land on pages, ${oldUrls.length} old URLs resolve.`);
