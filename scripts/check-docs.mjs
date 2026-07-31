#!/usr/bin/env node
// Validates docs.json navigation against files on disk.
// Fails on: pages referenced in docs.json that don't exist; .mdx files on
// disk that are neither in navigation nor in scripts/docs-allowlist.txt.
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
  }
}
collect(docs.navigation);

const missing = pages.filter((p) => !existsSync(join(ROOT, `${p}.mdx`)));

const allowlistPath = join(ROOT, "scripts", "docs-allowlist.txt");
const allowlist = existsSync(allowlistPath)
  ? readFileSync(allowlistPath, "utf8").split("\n").map((s) => s.trim()).filter(Boolean)
  : [];

const SKIP = new Set(["node_modules", ".git", "snippets", "docs", "scripts", "images", "logo", ".claude"]);
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

if (missing.length) console.error("MISSING (in docs.json, not on disk):\n  " + missing.join("\n  "));
if (orphans.length) console.error("ORPHANS (on disk, not in nav or allowlist):\n  " + orphans.join("\n  "));
if (staleAllow.length) console.error("STALE ALLOWLIST (file no longer exists):\n  " + staleAllow.join("\n  "));
if (allowlist.length) console.warn(`note: ${allowlist.length} file(s) on allowlist pending absorption`);
if (missing.length || orphans.length || staleAllow.length || pyErrors.length) process.exit(1);
console.log(`OK: ${pages.length} nav pages, 0 missing, 0 unexplained orphans, all python fences parse.`);
