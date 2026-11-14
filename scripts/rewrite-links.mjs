// Rewrites internal doc links that point at a redirect source, so pages link
// straight to the redirect's destination. The rules are the "redirects" in
// docs.json: add a redirect when you move or delete a page, then run this.
//
// A link is rewritten only in a link-start context ("(", '"' or "'") and only
// when the old path ends there (followed by ")", a quote, "#", "?" or
// whitespace), so /platform never corrupts /platform/onboarding. The root
// redirect ("/") and wildcard sources are skipped.
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const { redirects = [] } = JSON.parse(readFileSync(join(ROOT, "docs.json"), "utf8"));
const matchers = redirects
  .filter(({ source }) => source !== "/" && !/[:*]/.test(source))
  .map(({ source, destination }) => ({
    re: new RegExp("([(\"'])" + escapeRegExp(source) + "(?=[)\"'#?\\s])", "g"),
    to: destination,
  }));

function rewrite(text) {
  let out = text;
  let count = 0;
  for (const { re, to } of matchers) {
    out = out.replace(re, (_match, delim) => {
      count++;
      return delim + to;
    });
  }
  return { out, count };
}

const SKIP = new Set([
  "node_modules",
  ".git",
  "docs",
  "scripts",
  "images",
  "logo",
  ".claude",
]);

const files = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!SKIP.has(name)) walk(full);
    } else if (name.endsWith(".mdx")) {
      files.push(full);
    }
  }
}
walk(ROOT);

let totalFiles = 0;
let totalReplacements = 0;
for (const file of files.sort()) {
  const text = readFileSync(file, "utf8");
  const { out, count } = rewrite(text);
  if (count > 0) {
    writeFileSync(file, out);
    totalFiles++;
    totalReplacements += count;
    console.log(`${relative(ROOT, file)}: ${count}`);
  }
}
console.log(
  `\nDone: ${totalReplacements} replacement(s) across ${totalFiles} file(s).`,
);
