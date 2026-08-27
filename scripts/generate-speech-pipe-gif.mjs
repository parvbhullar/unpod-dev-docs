import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const WIDTH = 920;
const HEIGHT = 360;
const FPS = 12;
const FRAMES = 72;
const OUT = path.resolve("images/diagrams/speech-pipe-flow.gif");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "speech-pipe-gif-"));

const chromeCandidates = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
].filter(Boolean);

const chrome = chromeCandidates.find((candidate) => fs.existsSync(candidate));
if (!chrome) {
  throw new Error("Could not find Chrome. Set CHROME_PATH to a Chromium-compatible browser.");
}

const colors = {
  bg: "#030303",
  panel: "#070808",
  border: "#00d8e8",
  dimBorder: "#11535a",
  text: "#f7f7f7",
  muted: "#59636b",
  dim: "#2a3439",
  cyan: "#00d8e8",
};

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function text(x, y, lines, cls = "label", anchor = "middle") {
  const items = Array.isArray(lines) ? lines : [lines];
  const gap = cls === "tiny" ? 17 : 22;
  const start = -((items.length - 1) * gap) / 2;
  return `<text x="${x}" y="${y + start}" class="${cls}" text-anchor="${anchor}">
    ${items.map((line, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : gap}">${esc(line)}</tspan>`).join("\n    ")}
  </text>`;
}

function node(x, y, w, h, label, active = false) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" class="node ${active ? "active" : ""}"/>
  ${text(x + w / 2, y + h / 2 + 6, label)}`;
}

const paths = [
  { id: "phone", color: colors.cyan, points: [[170, 100], [170, 132]] },
  { id: "profile", color: colors.cyan, points: [[255, 164], [555, 164]] },
  { id: "runner", color: colors.cyan, points: [[170, 186], [170, 220]] },
  { id: "context", color: colors.cyan, points: [[170, 272], [170, 288]] },
];

function pathD(points) {
  return `M ${points.map(([x, y]) => `${x} ${y}`).join(" L ")}`;
}

function pathLength(points) {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const [x1, y1] = points[i - 1];
    const [x2, y2] = points[i];
    total += Math.hypot(x2 - x1, y2 - y1);
  }
  return total;
}

function pointAt(points, progress) {
  const total = pathLength(points);
  let remaining = total * progress;
  for (let i = 1; i < points.length; i += 1) {
    const [x1, y1] = points[i - 1];
    const [x2, y2] = points[i];
    const segment = Math.hypot(x2 - x1, y2 - y1);
    if (remaining <= segment) {
      const ratio = segment === 0 ? 0 : remaining / segment;
      return [x1 + (x2 - x1) * ratio, y1 + (y2 - y1) * ratio];
    }
    remaining -= segment;
  }
  return points.at(-1);
}

function basePath(entry) {
  return `<path d="${pathD(entry.points)}" class="basePath" marker-end="url(#arrow-gray)"/>`;
}

function activePath(entry, progress, complete = false) {
  const length = pathLength(entry.points);
  const visible = Math.max(0, Math.min(1, progress));
  const [x, y] = pointAt(entry.points, visible);
  return `<path d="${pathD(entry.points)}" class="activePath" stroke="${entry.color}" stroke-dasharray="${length * visible} ${length}" marker-end="${complete ? "url(#arrow-active)" : ""}"/>
  <circle cx="${x}" cy="${y}" r="6" fill="${entry.color}" opacity="${visible > 0 && visible < 1 ? 1 : 0}" filter="url(#glow)"/>`;
}

function svg(frame) {
  const loop = (frame / FRAMES) * paths.length;
  const current = Math.floor(loop) % paths.length;
  const progress = loop - Math.floor(loop);

  const overlays = paths
    .map((entry, index) => {
      if (index < current) return activePath(entry, 1, true);
      if (index === current) return activePath(entry, progress, false);
      return "";
    })
    .join("\n");

  const activeIds = new Set([
    paths[current].id,
    current > 0 ? paths[current - 1].id : "",
  ]);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <marker id="arrow-gray" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="${colors.dim}"/>
    </marker>
    <marker id="arrow-active" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="${colors.cyan}"/>
    </marker>
    <style>
      .title { font: 700 18px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; fill: ${colors.text}; letter-spacing: 6px; }
      .card { fill: ${colors.bg}; stroke: ${colors.dimBorder}; stroke-width: 1.5; stroke-dasharray: 7 7; }
      .group { fill: none; stroke: ${colors.cyan}; stroke-width: 1.5; stroke-dasharray: 7 7; opacity: 0.9; }
      .node { fill: ${colors.panel}; stroke: ${colors.border}; stroke-width: 2; }
      .node.active { stroke: ${colors.cyan}; stroke-width: 2.7; filter: url(#glow); }
      .label { font: 700 15px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; fill: ${colors.text}; }
      .small { font: 700 13px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; fill: ${colors.text}; }
      .tiny { font: 700 11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; fill: ${colors.muted}; }
      .basePath { fill: none; stroke: ${colors.dim}; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
      .activePath { fill: none; stroke-width: 4.5; stroke-linecap: round; stroke-linejoin: round; }
    </style>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${colors.bg}"/>
  ${text(WIDTH / 2, 28, "SPEECH PIPE FLOW", "title")}
  <rect x="28" y="42" width="864" height="292" rx="16" class="card"/>
  <rect x="64" y="122" width="768" height="88" rx="12" class="group"/>
  ${node(82, 54, 176, 46, "Phone Number", activeIds.has("phone"))}
  ${node(82, 140, 176, 46, "Speech Pipe", activeIds.has("profile") || activeIds.has("runner"))}
  ${node(82, 226, 304, 46, "AgentRunner (your Python process)", activeIds.has("runner") || activeIds.has("context"))}
  ${node(82, 290, 304, 34, "CallContext -> entrypoint()", activeIds.has("context"))}
  ${node(555, 140, 240, 46, "STT/TTS stack", activeIds.has("profile"))}
  ${text(402, 148, "voice_profile", "small")}
  ${paths.map(basePath).join("\n")}
  ${overlays}
  ${text(170, 120, "call arrives", "tiny")}
  ${text(170, 207, "dispatch", "tiny")}
</svg>`;
}

try {
  for (let frame = 0; frame < FRAMES; frame += 1) {
    const svgPath = path.join(TMP, `frame-${String(frame).padStart(3, "0")}.svg`);
    const pngPath = path.join(TMP, `frame-${String(frame).padStart(3, "0")}.png`);
    fs.writeFileSync(svgPath, svg(frame));
    execFileSync(chrome, [
      "--headless",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      `--screenshot=${pngPath}`,
      `--window-size=${WIDTH},${HEIGHT}`,
      `file://${svgPath}`,
    ], { stdio: "ignore" });
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  execFileSync("ffmpeg", [
    "-y",
    "-framerate",
    String(FPS),
    "-i",
    path.join(TMP, "frame-%03d.png"),
    "-vf",
    `fps=${FPS},split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer`,
    "-loop",
    "0",
    OUT,
  ], { stdio: "ignore" });
  console.log(`Wrote ${OUT}`);
} finally {
  fs.rmSync(TMP, { recursive: true, force: true });
}
