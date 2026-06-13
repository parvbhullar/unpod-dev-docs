import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.resolve("images/diagrams");
const W = 1672;
const H = 941;

fs.mkdirSync(OUT_DIR, { recursive: true });

const COLORS = {
  bg: "#020303",
  panel: "#050707",
  gray: "#4a4d55",
  muted: "#a8abb4",
  text: "#f0f0f0",
  purple: "#8d75ff",
  cyan: "#00d8e8",
};

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function svgFile(title, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeXml(title)}">
  <defs>
    <pattern id="hatch" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="16" stroke="#1a1d22" stroke-width="3" opacity="0.7"/>
    </pattern>
    <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <marker id="arrow-purple" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="${COLORS.purple}"/>
    </marker>
    <marker id="arrow-cyan" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="${COLORS.cyan}"/>
    </marker>
    <style>
      svg { background: ${COLORS.bg}; }
      .title { font: 700 44px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; fill: ${COLORS.text}; letter-spacing: 9px; }
      .label { font: 700 22px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; fill: ${COLORS.text}; letter-spacing: 3px; }
      .small { font: 700 17px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; fill: ${COLORS.muted}; letter-spacing: 2px; }
      .tiny { font: 700 15px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; fill: ${COLORS.muted}; letter-spacing: 1px; }
      .panel { fill: url(#hatch); stroke: ${COLORS.gray}; stroke-width: 2; }
      .box { fill: ${COLORS.bg}; stroke: ${COLORS.gray}; stroke-width: 2.5; }
      .purple { stroke: ${COLORS.purple}; }
      .cyan { stroke: ${COLORS.cyan}; }
      .purpleText { fill: ${COLORS.purple}; }
      .cyanText { fill: ${COLORS.cyan}; }
      .flow { fill: none; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 14 22; animation: dash 1.8s linear infinite; }
      .flow.fast { animation-duration: 1.35s; }
      .flow.slow { animation-duration: 2.4s; }
      .dim { opacity: 0.72; }
      .pulse { filter: url(#glow); animation: pulse 1.7s ease-in-out infinite; transform-origin: center; }
      @keyframes dash { to { stroke-dashoffset: -36; } }
      @keyframes pulse { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
      @media (prefers-reduced-motion: reduce) {
        .flow, .pulse { animation: none; }
      }
    </style>
  </defs>
  <rect width="${W}" height="${H}" fill="${COLORS.bg}"/>
  <text x="${W / 2}" y="70" text-anchor="middle" class="title">${escapeXml(title)}</text>
  ${body}
</svg>
`;
}

function textBlock(x, y, lines, className = "label", anchor = "middle", gap = 30) {
  const list = Array.isArray(lines) ? lines : [lines];
  const offset = -((list.length - 1) * gap) / 2;
  return `<text x="${x}" y="${y + offset}" text-anchor="${anchor}" class="${className}">
    ${list.map((line, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : gap}">${escapeXml(line)}</tspan>`).join("\n    ")}
  </text>`;
}

function panel(x, y, w, h, label, color = "purple") {
  const textClass = color === "cyan" ? "label cyanText" : "label purpleText";
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" class="panel ${color}"/>
  ${textBlock(x + w / 2, y + 44, label, textClass)}`;
}

function box(x, y, w, h, label, color = "gray", cls = "") {
  const colorClass = color === "cyan" ? "cyan" : color === "purple" ? "purple" : "";
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" class="box ${colorClass} ${cls}"/>
  ${textBlock(x + w / 2, y + h / 2 + 8, label, "label")}`;
}

function smallBox(x, y, w, h, label, color = "gray") {
  const colorClass = color === "cyan" ? "cyan" : color === "purple" ? "purple" : "";
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" class="box ${colorClass}"/>
  ${textBlock(x + w / 2, y + h / 2 + 6, label, "small")}`;
}

function pill(x, y, w, h, label, color = "cyan") {
  const colorClass = color === "cyan" ? "cyan" : "purple";
  const textClass = color === "cyan" ? "small cyanText" : "small purpleText";
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="#111318" stroke="${color === "cyan" ? COLORS.cyan : COLORS.purple}" stroke-width="2"/>
  ${textBlock(x + w / 2, y + h / 2 + 6, label, textClass)}`;
}

function flow(d, color = "cyan", marker = true, cls = "") {
  const stroke = color === "cyan" ? COLORS.cyan : COLORS.purple;
  const markerId = color === "cyan" ? "arrow-cyan" : "arrow-purple";
  return `<path d="${d}" class="flow ${color} ${cls}" stroke="${stroke}" ${marker ? `marker-end="url(#${markerId})"` : ""}/>`;
}

function lineLabel(x, y, label, color = "cyan") {
  const cls = color === "cyan" ? "tiny cyanText" : "tiny purpleText";
  return textBlock(x, y, label, cls);
}

function write(name, title, body) {
  fs.writeFileSync(path.join(OUT_DIR, `${name}.svg`), svgFile(title, body));
}

write("unpod-voice-stack", "UNPOD VOICE STACK", `
  ${panel(44, 118, 392, 760, "USER ENTRYPOINTS", "purple")}
  ${panel(622, 118, 430, 760, "UNPOD MANAGED LAYER", "gray")}
  ${panel(1234, 118, 394, 760, "YOUR AGENT", "cyan")}
  ${box(98, 225, 280, 132, "PHONE", "purple")}
  ${box(98, 424, 280, 132, "BROWSER", "purple")}
  ${box(98, 624, 280, 132, "MOBILE", "purple")}
  ${box(672, 220, 326, 124, "PSTN / WEBRTC")}
  ${box(672, 398, 326, 124, "STT + VAD")}
  ${box(672, 576, 326, 124, "ORCHESTRATOR")}
  ${box(672, 746, 326, 96, "TTS + STREAMING")}
  ${box(1292, 220, 286, 124, "AGENTRUNNER", "cyan")}
  ${box(1292, 422, 286, 124, ["DIALOG", "MACHINE"], "cyan")}
  ${box(1292, 626, 286, 124, "TOOLS / APIS", "cyan")}
  ${flow("M378 291 H662", "purple")}
  ${flow("M378 490 H662", "purple")}
  ${flow("M378 690 H662", "purple")}
  ${flow("M998 282 H1282", "cyan")}
  ${flow("M998 460 H1282", "cyan")}
  ${flow("M998 638 H1282", "cyan")}
  ${flow("M1282 318 H1010", "cyan", true, "slow")}
  ${flow("M1282 520 H1010", "cyan", true, "slow")}
  ${flow("M1282 724 H1010", "cyan", true, "slow")}
  ${lineLabel(520, 262, "AUDIO IN", "purple")}
  ${lineLabel(1140, 252, "TEXT TURN", "cyan")}
  ${lineLabel(1140, 332, "REPLY TEXT", "cyan")}
`);

write("unpod-four-pillars", "UNPOD FOUR PILLARS", `
  ${panel(46, 142, 376, 650, "COMMUNICATION INFRA", "purple")}
  ${panel(486, 142, 376, 650, "VOICE STACK", "purple")}
  ${panel(922, 142, 376, 650, "CONVERSATION FRAMEWORK", "cyan")}
  ${panel(1360, 142, 266, 650, "CPAAS PLATFORM", "cyan")}
  ${box(78, 318, 312, 220, "unpod", "purple")}
  ${box(518, 318, 312, 220, "unpod", "purple")}
  ${box(954, 318, 312, 220, "SUPERDIALOG", "cyan")}
  ${box(1388, 318, 210, 220, "OPEN SOURCE", "cyan")}
  ${textBlock(234, 675, "PHONE NUMBERS + SIP", "small purpleText")}
  ${textBlock(674, 675, "STT + TTS + VAD", "small purpleText")}
  ${textBlock(1110, 675, "FLOW GRAPHS + TOOLS", "small cyanText")}
  ${textBlock(1493, 675, "STUDIO + ANALYTICS", "small cyanText")}
  ${flow("M422 448 H476", "purple")}
  ${flow("M862 448 H914", "purple")}
  ${flow("M1298 448 H1350", "cyan")}
`);

write("where-unpod-sits", "WHERE UNPOD SITS", `
  ${panel(476, 116, 742, 186, "LAYER 3", "purple")}
  ${box(534, 152, 626, 96, ["AGENT PLATFORMS"], "purple")}
  ${textBlock(846, 262, "VAPI / RETELL / BLAND", "small purpleText")}
  ${panel(476, 380, 742, 202, "LAYER 2", "cyan")}
  ${box(534, 418, 626, 100, "UNPOD", "cyan")}
  ${textBlock(846, 536, "COMMUNICATION INFRA", "small cyanText")}
  ${panel(476, 668, 742, 190, "LAYER 1", "purple")}
  ${box(534, 704, 626, 96, "RAW TELEPHONY", "purple")}
  ${textBlock(846, 815, "TWILIO / PLIVO / BANDWIDTH", "small purpleText")}
  ${flow("M846 380 V312", "cyan")}
  ${flow("M846 582 V660", "cyan")}
  ${lineLabel(936, 350, "USED BY", "cyan")}
  ${lineLabel(946, 636, "BUILDS ON", "cyan")}
`);

write("voice-profile-pipeline", "VOICE PROFILE PIPELINE", `
  ${box(640, 108, 392, 72, "CALLER SPEAKS", "purple")}
  ${panel(616, 220, 440, 142, "VOICE PROFILE", "cyan")}
  ${smallBox(650, 274, 372, 62, "STT", "cyan")}
  ${box(640, 392, 392, 72, "USER TEXT", "purple")}
  ${box(640, 502, 392, 72, "DIALOG MACHINE", "purple")}
  ${box(640, 602, 392, 72, "AGENT TEXT", "purple")}
  ${panel(616, 710, 440, 132, "VOICE PROFILE", "cyan")}
  ${smallBox(650, 760, 372, 58, "TTS + VOICE", "cyan")}
  <rect x="640" y="866" width="392" height="64" rx="16" class="box purple"/>
  ${textBlock(836, 905, "CALLER HEARS", "label")}
  ${flow("M836 180 V220", "cyan")}
  ${flow("M836 362 V392", "cyan")}
  ${flow("M836 464 V502", "cyan")}
  ${flow("M836 574 V602", "cyan")}
  ${flow("M836 674 V710", "cyan")}
  ${flow("M836 842 V866", "cyan")}
`);

write("superdialog-session-integration", "SUPERDIALOG + SESSION", `
  ${smallBox(28, 436, 172, 112, ["USER", "SPEAKS"])}
  ${panel(244, 374, 224, 256, "VOICE STACK", "cyan")}
  ${box(268, 452, 176, 120, "STT", "cyan")}
  ${smallBox(508, 436, 170, 112, "USER TEXT")}
  ${panel(720, 374, 272, 256, "SUPERDIALOG", "purple")}
  ${box(736, 452, 240, 120, ["DIALOG", "MACHINE", "TURN"], "purple")}
  ${smallBox(1032, 436, 170, 112, ["AGENT", "REPLY"])}
  ${panel(1236, 374, 222, 256, "VOICE STACK", "cyan")}
  ${box(1260, 452, 174, 120, "TTS", "cyan")}
  ${smallBox(1474, 436, 170, 112, ["CALLER", "HEARS"])}
  ${pill(450, 254, 288, 44, "HOOK: USER_TURN", "cyan")}
  ${pill(978, 254, 288, 44, "HOOK: AGENT_TURN", "cyan")}
  ${flow("M200 492 H244", "cyan")}
  ${flow("M468 492 H508", "cyan")}
  ${flow("M678 492 H710", "purple")}
  ${flow("M992 492 H1022", "purple")}
  ${flow("M1202 492 H1236", "cyan")}
  ${flow("M1458 492 H1474", "cyan")}
  ${flow("M594 298 V436", "cyan", false, "slow")}
  ${flow("M1120 298 V436", "cyan", false, "slow")}
`);

write("superdialog-runtime", "SUPERDIALOG RUNTIME", `
  ${smallBox(48, 318, 232, 170, "USER TEXT", "purple")}
  ${panel(426, 110, 432, 560, "DIALOGMACHINE.TURN", "purple")}
  ${smallBox(496, 178, 314, 56, "LOAD NODE", "purple")}
  ${smallBox(496, 260, 314, 56, "BUILD PROMPT", "purple")}
  ${smallBox(496, 342, 314, 56, "CALL LLM", "purple")}
  ${smallBox(496, 424, 314, 56, "RUN TOOLS", "purple")}
  ${smallBox(496, 506, 314, 56, "UPDATE STATE", "purple")}
  ${smallBox(496, 588, 314, 56, "ADVANCE EDGE", "purple")}
  ${panel(968, 230, 300, 356, "TURN RESULT", "cyan")}
  ${smallBox(1012, 310, 212, 64, "REPLY", "cyan")}
  ${smallBox(1012, 398, 212, 64, "TOOLS", "cyan")}
  ${smallBox(1012, 486, 212, 64, "METADATA", "cyan")}
  ${panel(1382, 180, 242, 436, "HOST", "gray")}
  ${smallBox(1410, 254, 188, 64, "CLI")}
  ${smallBox(1410, 340, 188, 64, "FASTAPI")}
  ${smallBox(1410, 426, 188, 64, "LIVEKIT")}
  ${smallBox(1410, 512, 188, 64, "UNPOD")}
  ${smallBox(278, 778, 216, 96, "FLOW", "cyan")}
  ${smallBox(546, 778, 216, 96, "MODEL URI", "cyan")}
  ${smallBox(814, 778, 216, 96, "TOOLS", "cyan")}
  ${flow("M280 404 H416", "purple")}
  ${flow("M858 394 H958", "cyan")}
  ${flow("M1268 404 H1372", "cyan")}
  ${flow("M653 234 V260", "purple", false)}
  ${flow("M653 316 V342", "purple", false)}
  ${flow("M653 398 V424", "purple", false)}
  ${flow("M653 480 V506", "purple", false)}
  ${flow("M653 562 V588", "purple", false)}
  ${flow("M386 778 C386 720 476 720 496 670", "cyan")}
  ${flow("M654 778 V680", "cyan")}
  ${flow("M922 778 C922 720 832 720 810 670", "cyan")}
`);

write("core-component-data-flow", "CORE COMPONENT DATA FLOW", `
  ${smallBox(24, 388, 224, 144, "NUMBER", "purple")}
  ${panel(346, 360, 242, 200, "ROUTING", "purple")}
  ${box(370, 448, 194, 72, "BRIDGE", "purple")}
  ${panel(704, 280, 262, 444, "AI LOGIC", "cyan")}
  ${box(734, 328, 202, 112, "AGENT 1", "cyan")}
  ${box(734, 560, 202, 112, "AGENT 2", "cyan")}
  ${panel(1092, 358, 242, 306, "CARRIER", "cyan")}
  ${box(1120, 452, 190, 112, "PROVIDER", "cyan")}
  ${smallBox(1424, 408, 224, 144, "ENDPOINT", "purple")}
  ${flow("M248 460 H346", "purple")}
  ${flow("M588 484 C650 484 650 384 724 384", "purple")}
  ${flow("M588 484 C650 484 650 616 724 616", "purple")}
  ${flow("M936 384 C1044 384 1044 508 1110 508", "cyan")}
  ${flow("M936 616 C1044 616 1044 508 1110 508", "cyan")}
  ${flow("M1310 508 H1414", "cyan")}
`);

write("call-lifecycle", "CALL LIFECYCLE", `
  ${panel(28, 150, 214, 574, "CALLER", "purple")}
  ${box(56, 242, 160, 82, "USER", "purple")}
  ${panel(380, 150, 320, 574, "UNPOD MANAGED", "cyan")}
  ${box(422, 242, 236, 82, "NUMBER", "cyan")}
  ${box(422, 400, 236, 92, ["SPEECH", "PIPELINE"], "cyan")}
  ${box(422, 586, 236, 82, "ORCHESTRATOR", "cyan")}
  ${panel(902, 150, 332, 574, "YOUR SERVER", "purple")}
  ${box(948, 242, 240, 82, ["AGENT", "RUNNER"], "purple")}
  ${box(948, 400, 240, 82, "SESSION", "purple")}
  ${box(948, 586, 240, 82, ["DIALOG", "MACHINE"], "purple")}
  ${panel(1370, 150, 270, 574, ["STORAGE", "+ HOOKS"], "gray")}
  ${box(1406, 242, 198, 82, "TRANSCRIPT")}
  ${box(1406, 404, 198, 82, "METRICS")}
  ${box(1406, 586, 198, 82, "WEBHOOKS")}
  ${flow("M216 282 H412", "cyan")}
  ${pill(258, 260, 170, 42, "1 CALL START", "cyan")}
  ${flow("M658 446 H938", "cyan")}
  ${pill(708, 424, 192, 42, "2 AUDIO TO TEXT", "cyan")}
  ${flow("M658 627 H938", "cyan")}
  ${pill(734, 605, 144, 42, "3 DISPATCH", "cyan")}
  ${flow("M1068 482 V576", "purple")}
  ${pill(1094, 520, 92, 42, "4 TURN", "purple")}
  ${flow("M948 627 C790 627 790 446 668 446", "purple")}
  ${pill(734, 526, 160, 42, "5 REPLY TEXT", "purple")}
  ${flow("M1188 442 H1396", "purple")}
  ${pill(1244, 420, 138, 42, "6 CALL END", "purple")}
  <line x1="722" y1="748" x2="722" y2="868" stroke="${COLORS.gray}" stroke-width="2" stroke-dasharray="8 10"/>
  ${pill(904, 784, 298, 50, "YOU OWN THIS SIDE", "purple")}
  ${flow("M1202 809 H1406", "purple")}
`);

write("superdialog-flow-graph", "SUPERDIALOG FLOW GRAPH", `
  ${box(48, 330, 178, 112, "GREET", "purple")}
  ${box(404, 316, 218, 140, ["COLLECT", "DETAILS"], "purple")}
  ${box(804, 316, 220, 140, ["CHECK", "AVAILABILITY"], "cyan")}
  ${box(1184, 330, 160, 112, "CONFIRM", "cyan")}
  ${box(1490, 330, 136, 112, "DONE", "cyan")}
  ${flow("M226 386 H394", "purple")}
  ${flow("M622 386 H794", "purple")}
  ${flow("M1024 386 H1174", "cyan")}
  ${flow("M1344 386 H1480", "cyan")}
  ${flow("M514 456 C514 566 456 566 456 456", "purple")}
  ${flow("M914 456 C914 580 562 580 562 456", "cyan")}
  ${lineLabel(306, 352, "ready", "purple")}
  ${lineLabel(704, 350, "details provided", "purple")}
  ${lineLabel(1100, 350, "slot available", "cyan")}
  ${lineLabel(1416, 350, "confirmed", "cyan")}
  ${lineLabel(480, 610, "missing info", "purple")}
  ${lineLabel(718, 606, "try another time", "cyan")}
  <rect x="1254" y="720" width="380" height="144" rx="14" fill="none" stroke="${COLORS.gray}" stroke-width="2" stroke-dasharray="8 8"/>
  <rect x="1282" y="742" width="90" height="40" rx="10" fill="${COLORS.bg}" stroke="${COLORS.purple}" stroke-width="2"/>
  ${textBlock(1510, 770, "NODE = STATE", "small")}
  ${flow("M1284 822 H1364", "cyan")}
  ${textBlock(1510, 830, "EDGE = CONDITION", "small")}
`);

write("superdialog-engines-contract", "SUPERDIALOG ENGINE CONTRACT", `
  ${panel(420, 118, 832, 140, "HOST PLATFORMS", "gray")}
  ${pill(478, 178, 134, 44, "LIVEKIT", "purple")}
  ${pill(634, 178, 134, 44, "PIPECAT", "purple")}
  ${pill(790, 178, 134, 44, "FASTAPI", "purple")}
  ${pill(946, 178, 172, 44, "WEBSOCKET", "purple")}
  ${pill(1140, 178, 72, 44, "CLI", "purple")}
  ${box(574, 318, 524, 78, "SUPERDIALOG.ADAPTERS", "cyan")}
  ${box(574, 454, 524, 78, "SESSIONWORKER", "cyan")}
  ${box(466, 590, 740, 82, ["AGENT PROTOCOL", "TURN / ASSIST / CHAT_CTX / LOAD_CHAT_CTX"], "purple")}
  ${box(250, 758, 388, 94, ["PLAYBOOKAGENT", "ENGINE B DEFAULT"], "cyan")}
  ${box(1034, 758, 388, 94, ["DIALOGMACHINE", "ENGINE A LEGACY"], "purple")}
  ${smallBox(260, 872, 160, 54, "RUNTIME", "cyan")}
  ${smallBox(432, 872, 160, 54, "EVENTLOG", "cyan")}
  ${smallBox(1044, 872, 160, 54, "FLOW GRAPH", "purple")}
  ${smallBox(1216, 872, 160, 54, "STATE", "purple")}
  ${flow("M836 258 V308", "cyan")}
  ${flow("M836 396 V444", "cyan")}
  ${flow("M836 532 V580", "cyan")}
  ${flow("M704 672 C704 720 572 720 520 748", "cyan")}
  ${flow("M968 672 C968 720 1100 720 1152 748", "purple")}
  ${flow("M444 852 V862", "cyan", false)}
  ${flow("M1228 852 V862", "purple", false)}
`);

write("playbook-turn-runtime", "PLAYBOOK TURN RUNTIME", `
  ${smallBox(44, 406, 202, 118, "USER TEXT", "purple")}
  ${box(318, 386, 264, 146, ["PLAYBOOKAGENT", "TURN"], "purple")}
  ${panel(720, 132, 420, 292, "DIRECTOR TASK", "cyan")}
  ${smallBox(760, 208, 340, 54, "APPEND UTTERANCE", "cyan")}
  ${smallBox(760, 282, 340, 54, "EVALUATE SLOTS", "cyan")}
  ${smallBox(760, 356, 340, 54, "QUIESCE RULES", "cyan")}
  ${panel(720, 518, 420, 292, "TALKER STREAM", "purple")}
  ${smallBox(760, 590, 340, 54, "SNAPSHOT STATE N", "purple")}
  ${smallBox(760, 664, 340, 54, "SOFT OR HARD GATE", "purple")}
  ${smallBox(760, 738, 340, 54, "TOKENS TO HOST", "purple")}
  ${box(1270, 324, 282, 120, "JOIN", "cyan")}
  ${box(1270, 590, 282, 120, ["DONE", "CHECKPOINT + OUTCOME"], "cyan")}
  ${flow("M246 465 H308", "purple")}
  ${flow("M582 430 C650 430 650 278 710 278", "cyan")}
  ${flow("M582 490 C650 490 650 664 710 664", "purple")}
  ${flow("M1140 280 C1210 280 1210 384 1260 384", "cyan")}
  ${flow("M1140 738 C1210 738 1210 650 1260 650", "purple")}
  ${flow("M1412 444 V580", "cyan")}
  ${lineLabel(634, 302, "SHIELDED", "cyan")}
  ${lineLabel(638, 628, "STREAMS", "purple")}
`);

write("playbook-loading-pipeline", "PLAYBOOK LOADING PIPELINE", `
  ${smallBox(54, 242, 300, 86, "SIMPLE YAML", "purple")}
  ${smallBox(54, 424, 300, 86, "FULL YAML", "purple")}
  ${smallBox(54, 606, 300, 86, "LEGACY FLOW JSON", "purple")}
  ${box(516, 210, 310, 116, "SIMPLE_TO_PLAYBOOK", "cyan")}
  ${box(516, 398, 310, 116, "PLAYBOOK.LOAD", "cyan")}
  ${box(516, 584, 310, 116, "COMPILE_FLOW", "cyan")}
  ${panel(988, 292, 360, 300, "VALIDATED ARTIFACT", "purple")}
  ${box(1030, 386, 276, 112, ["PLAYBOOK", "IR"], "purple")}
  ${box(1442, 386, 180, 112, "RUNTIME", "cyan")}
  ${flow("M354 285 H506", "cyan")}
  ${flow("M354 467 H506", "cyan")}
  ${flow("M354 649 H506", "cyan")}
  ${flow("M826 268 C918 268 918 442 978 442", "cyan")}
  ${flow("M826 456 H978", "cyan")}
  ${flow("M826 642 C918 642 918 442 978 442", "cyan")}
  ${flow("M1348 442 H1432", "purple")}
`);

write("playbook-checkpoint-model", "PLAYBOOK CHECKPOINT MODEL", `
  ${panel(320, 134, 620, 560, "CHECKPOINT: COLLECT_DETAILS", "purple")}
  ${smallBox(372, 224, 516, 68, ["GOAL", "CITY + DATE + PARTY SIZE"], "purple")}
  ${smallBox(372, 326, 516, 68, ["SLOTS", "CITY / DATE / PLAYERS"], "purple")}
  ${smallBox(372, 428, 516, 68, ["GUIDANCE", "COLLECT NATURALLY"], "purple")}
  ${smallBox(372, 530, 516, 82, ["ADVANCE RULES", "DETAILS COMPLETE OR COURSE INFO"], "purple")}
  ${panel(1030, 210, 330, 236, "FREE CONVERSATION", "cyan")}
  ${box(1066, 304, 258, 78, "MODEL TALKS", "cyan")}
  ${box(1058, 574, 276, 96, ["NEXT", "CHECKPOINT"], "cyan")}
  ${flow("M940 340 H1020", "cyan")}
  ${flow("M1195 446 V564", "cyan")}
  ${flow("M632 612 C632 760 1188 760 1190 680", "purple")}
  ${lineLabel(1182, 510, "OUTCOME MET", "cyan")}
  ${lineLabel(772, 754, "FRAMEWORK OWNS PROGRESS", "purple")}
`);

write("superdialog-text-loop", "SUPERDIALOG TEXT LOOP", `
  ${box(152, 356, 290, 150, "USER TEXT", "purple")}
  ${panel(602, 250, 468, 360, "AGENT PROTOCOL", "cyan")}
  ${box(664, 344, 344, 94, "AGENT.TURN", "cyan")}
  ${smallBox(664, 470, 158, 62, "TOOLS", "cyan")}
  ${smallBox(850, 470, 158, 62, "STATE", "cyan")}
  ${box(1230, 356, 290, 150, "REPLY TEXT", "purple")}
  ${flow("M442 431 H592", "cyan")}
  ${flow("M1070 431 H1220", "cyan")}
`);

write("post-call-data-integration", "POST CALL DATA INTEGRATION", `
  ${box(72, 390, 260, 128, "UNPOD API", "purple")}
  ${box(524, 374, 330, 160, ["POLLING", "SERVICE"], "cyan")}
  ${panel(1070, 178, 420, 586, "YOUR SYSTEMS", "purple")}
  ${smallBox(1132, 264, 296, 68, "CRM", "purple")}
  ${smallBox(1132, 386, 296, 68, "SLACK", "purple")}
  ${smallBox(1132, 508, 296, 68, "DATABASE", "purple")}
  ${smallBox(1132, 630, 296, 68, "CUSTOM WEBHOOKS", "purple")}
  ${flow("M332 454 H514", "cyan")}
  ${flow("M854 454 H1060", "cyan")}
  ${flow("M1280 454 V344", "purple", false)}
  ${flow("M1280 454 V386", "purple", false)}
  ${flow("M1280 454 V508", "purple", false)}
  ${flow("M1280 454 V620", "purple", false)}
`);

write("platform-execution-lifecycle", "PLATFORM EXECUTION LIFECYCLE", `
  ${box(74, 392, 260, 122, ["CREATE", "TASK"], "purple")}
  ${box(458, 392, 260, 122, "PENDING", "cyan")}
  ${box(842, 392, 260, 122, "EXECUTING", "cyan")}
  ${box(1226, 276, 300, 110, "COMPLETED", "purple")}
  ${box(1226, 530, 300, 110, "FAILED", "purple")}
  ${flow("M334 453 H448", "cyan")}
  ${flow("M718 453 H832", "cyan")}
  ${flow("M1102 432 C1168 432 1168 331 1216 331", "purple")}
  ${flow("M1102 474 C1168 474 1168 585 1216 585", "purple")}
`);

write("bridge-lifecycle", "BRIDGE LIFECYCLE", `
  ${box(56, 390, 270, 126, ["CREATE BRIDGE", "DRAFT"], "purple")}
  ${box(430, 390, 270, 126, ["CONNECT", "PROVIDER"], "cyan")}
  ${box(804, 390, 270, 126, ["ASSIGN", "NUMBERS"], "cyan")}
  ${box(1178, 390, 220, 126, "ACTIVE", "purple")}
  ${box(1472, 390, 150, 126, "DELETE", "purple")}
  ${flow("M326 453 H420", "cyan")}
  ${flow("M700 453 H794", "cyan")}
  ${flow("M1074 453 H1168", "cyan")}
  ${flow("M1398 453 H1462", "purple")}
`);

write("agent-runner-dispatch", "AGENTRUNNER DISPATCH", `
  ${box(138, 240, 360, 132, ["UNPOD", "ORCHESTRATOR"], "cyan")}
  ${box(656, 240, 360, 132, "AGENTRUNNER", "purple")}
  ${box(1174, 240, 360, 132, ["ENTRYPOINT", "CALLCONTEXT"], "purple")}
  ${smallBox(656, 528, 360, 82, ["HEARTBEAT", "CAPACITY"], "cyan")}
  ${smallBox(1174, 528, 360, 82, ["SESSION", "RUN LOOP"], "cyan")}
  ${flow("M498 306 H646", "cyan")}
  ${lineLabel(572, 274, "WSS", "cyan")}
  ${flow("M1016 306 H1164", "purple")}
  ${lineLabel(1090, 274, "DISPATCH", "purple")}
  ${flow("M836 372 V518", "cyan")}
  ${flow("M1354 372 V518", "purple")}
`);

write("websocket-connectivity", "WEBSOCKET CONNECTIVITY", `
  ${box(86, 348, 300, 150, ["BROWSER", "APP", "CLIENT"], "purple")}
  ${box(526, 348, 320, 150, ["PIPE", "WSS ENDPOINT"], "cyan")}
  ${panel(980, 242, 366, 360, "UNPOD SPEECH PIPELINE", "cyan")}
  ${smallBox(1024, 336, 278, 62, "STT + VAD", "cyan")}
  ${smallBox(1024, 442, 278, 62, "TTS + BARGE-IN", "cyan")}
  ${box(1462, 348, 170, 150, ["YOUR", "RUNNER"], "purple")}
  ${flow("M386 423 H516", "cyan")}
  ${lineLabel(454, 390, "WSS", "cyan")}
  ${flow("M846 423 H970", "cyan")}
  ${flow("M1346 423 H1452", "purple")}
  ${lineLabel(1400, 390, "TEXT", "purple")}
`);

write("telephony-routing-flow", "TELEPHONY ROUTING FLOW", `
  ${box(66, 386, 270, 136, ["PHONE", "NUMBER"], "purple")}
  ${box(460, 386, 270, 136, "BRIDGE", "purple")}
  ${box(854, 386, 270, 136, "PROVIDER", "cyan")}
  ${box(1248, 386, 270, 136, "AGENT", "cyan")}
  ${flow("M336 454 H450", "purple")}
  ${flow("M730 454 H844", "cyan")}
  ${flow("M1124 454 H1238", "cyan")}
  ${lineLabel(595, 350, "ROUTING", "purple")}
  ${lineLabel(990, 350, "MEDIA", "cyan")}
`);
