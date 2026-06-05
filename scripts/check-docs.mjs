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

if (missing.length) console.error("MISSING (in docs.json, not on disk):\n  " + missing.join("\n  "));
if (orphans.length) console.error("ORPHANS (on disk, not in nav or allowlist):\n  " + orphans.join("\n  "));
if (staleAllow.length) console.error("STALE ALLOWLIST (file no longer exists):\n  " + staleAllow.join("\n  "));
if (allowlist.length) console.warn(`note: ${allowlist.length} file(s) on allowlist pending absorption`);
if (missing.length || orphans.length || staleAllow.length) process.exit(1);
console.log(`OK: ${pages.length} nav pages, 0 missing, 0 unexplained orphans.`);
