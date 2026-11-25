
// Text to speech pages: tts/overview, tts/compare.
// Pages import only `Tts` and pick a section with `view`. Mintlify silently drops
// every component after the first when a page imports several snippet components
// that share a helper (TtsPlay), so all views stay file-local.

// Names and places underlined in each line, keyed by language_line.
// Amounts, OTPs and times are found by pattern in TtsMarked.
const TTS_HL = {
  en_hospital: ["Mr. Raghunathan", "Dr. Meenakshi Sundaram"],
  hi_hospital: ["शर्मा जी", "डॉक्टर अनुराधा सक्सेना"],
  mr_hospital: ["कुलकर्णी साहेब", "डॉक्टर अमृता जोशी"],
  ta_hospital: ["ராமநாதன்", "டாக்டர் மீனாட்சி சுந்தரம்"],
  te_hospital: ["రెడ్డి గారు", "డాక్టర్ లక్ష్మీ ప్రసన్న"],
  en_delivery: ["Whitefield, Bengaluru"],
  hi_delivery: ["सेक्टर 62, नोएडा"],
  mr_delivery: ["कोथरूड, पुणे"],
  ta_delivery: ["அண்ணா நகர், சென்னை"],
  te_delivery: ["మాదాపూర్, హైదరాబాద్"],
};
// Codes and acronyms underlined in every line.
const TTS_HL_ALL = ["OPD 3", "B-1204", "B3", "C2", "UPI", "NEFT"];

const TtsMarked = ({ text, k }) => {
  const parts = (TTS_HL[k] || []).concat(TTS_HL_ALL, [
    "₹[0-9]+(?:,[0-9]+)*",
    "[0-9]+(?:[,:/.][0-9]+)*%?(?:\\s?(?:AM|PM))?",
  ]);
  const bits = text.split(new RegExp("(" + parts.join("|") + ")", "g"));
  return (
    <span>
      {bits.map((b, i) => (i % 2 ? <mark key={i} className="tts-hl">{b}</mark> : <span key={i}>{b}</span>))}
    </span>
  );
};

const TTS_AV = ["#796cff", "#f59e0b", "#10b981", "#ef4444", "#0ea5e9", "#ec4899", "#84cc16", "#8b5cf6"];

const TtsAvatar = ({ name, size }) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 997;
  const s = size || 28;
  return (
    <span className="tts-av" aria-hidden="true"
      style={{ background: TTS_AV[h % TTS_AV.length], width: s, height: s, fontSize: Math.round(s * 0.45) }}>
      {name.charAt(0)}
    </span>
  );
};

const TtsIcon = ({ playing }) => (playing ? (
  <svg viewBox="0 0 16 16" width="14" height="14"><rect x="3" y="2" width="3.5" height="12" fill="currentColor" /><rect x="9.5" y="2" width="3.5" height="12" fill="currentColor" /></svg>
) : (
  <svg viewBox="0 0 16 16" width="14" height="14"><path d="M4 2l10 6-10 6z" fill="currentColor" /></svg>
));

const TtsPlay = ({ src, dur, peaks, label, autoStart, mini }) => {
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const ref = useRef(null);
  const fmt = (s) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
  useEffect(() => {
    const a = new Audio(src);
    a.preload = "none";
    ref.current = a;
    const onTime = () => setT(a.currentTime);
    const onEnd = () => { setPlaying(false); setT(0); };
    const onOther = (e) => { if (e.detail !== a) { a.pause(); setPlaying(false); } };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    window.addEventListener("tts-play", onOther);
    if (autoStart) {
      window.dispatchEvent(new CustomEvent("tts-play", { detail: a }));
      a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
    return () => {
      a.pause();
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
      window.removeEventListener("tts-play", onOther);
    };
  }, [src]);
  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); return; }
    window.dispatchEvent(new CustomEvent("tts-play", { detail: a }));
    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };
  const aria = (playing ? "Pause" : "Play") + (label ? " " + label : "");
  if (mini) {
    return (
      <button type="button" className={playing ? "tts-btn tts-btn-sm on is-playing" : "tts-btn tts-btn-sm"} onClick={toggle} aria-label={aria}>
        <TtsIcon playing={playing} />
      </button>
    );
  }
  const bars = peaks || [];
  const done = dur ? t / dur : 0;
  return (
    <div className={playing ? "tts-play is-playing" : "tts-play"}>
      <button type="button" className="tts-btn" onClick={toggle} aria-label={aria}>
        <TtsIcon playing={playing} />
      </button>
      {bars.length > 0 ? (
        <div className="tts-wave" aria-hidden="true">
          {bars.map((p, i) => (
            <span key={i} className={i / bars.length < done ? "on" : ""}
              style={{ height: Math.max(8, Math.round(p * 100)) + "%", animationDelay: i * 7 + "ms" }} />
          ))}
        </div>
      ) : (
        <div className="tts-wave tts-wave-flat" aria-hidden="true"><span style={{ width: Math.round(done * 100) + "%" }} /></div>
      )}
      <span className="tts-time">{fmt(t)} / {fmt(dur || 0)}</span>
    </div>
  );
};

// Small bouncing bars shown next to whatever is playing.
const TtsEq = () => (
  <span className="tts-eq" aria-hidden="true"><i /><i /><i /><i /></span>
);

// Slow moving sine lines used as a backdrop in the hero and the closing band.
const TtsWaves = () => {
  const path = (amp, period, mid) => {
    let d = "M0 " + mid;
    for (let x = 0; x <= 2400; x += 10) d += " L" + x + " " + (mid + amp * Math.sin((x / period) * Math.PI * 2)).toFixed(1);
    return d;
  };
  return (
    <svg className="tts-waves" viewBox="0 0 1200 160" preserveAspectRatio="none" aria-hidden="true">
      <path d={path(18, 300, 80)} />
      <path d={path(12, 200, 90)} />
      <path d={path(26, 400, 70)} />
    </svg>
  );
};

const ttsUnpod = (data) => data.providers.find((p) => p.id === "unpod");
const ttsLang = (data, code) => data.languages.find((l) => l.code === code);

/* ---------- shared bits ---------- */

const TtsEyebrow = ({ n, label, meta }) => (
  <div className="tts tts-eyebrow">
    <span className="tts-eb-pill"><span className="tts-eb-n">{n}</span>{label}</span>
    {meta && <span className="tts-eb-meta">{meta}</span>}
  </div>
);

const TtsLinks = ({ links }) => (
  <div className="tts-ctas">
    {(links || []).map((l) => (
      <a key={l.href} href={l.href} className={l.solid ? "tts-cta solid" : "tts-cta"}>{l.label}</a>
    ))}
  </div>
);

const TtsBand = ({ title, text, links }) => (
  <div className="tts tts-band">
    <TtsWaves />
    <div>
      <div className="tts-band-title">{title}</div>
      <p>{text}</p>
    </div>
    <TtsLinks links={links} />
  </div>
);

/* ---------- overview ---------- */

const TtsHero = ({ data, links, children }) => {
  const unpod = ttsUnpod(data);
  const [lang, setLang] = useState(data.languages[0].code);
  const [go, setGo] = useState(false);
  const l = ttsLang(data, lang);
  const key = lang + "_" + data.heroCat;
  const clip = unpod.clips[key];
  const line = data.lines[lang][data.heroCat];
  const stats = [
    { label: "Languages", value: String(data.languages.length) },
    { label: "Voices", value: String(data.voices.length) },
    { label: "Audio", value: "48 kHz" },
  ];
  const greet = ["Hello", "नमस्ते", "नमस्कार", "வணக்கம்", "నమస్కారం"];
  const [gi, setGi] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setGi((n) => (n + 1) % greet.length), 2200);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="tts tts-hero">
      <TtsWaves />
      <div className="tts-hero-copy">
        <span className="tts-pill"><span className="tts-dot" />Unpod TTS · built in-house</span>
        <div className="tts-hero-title">
          Say <span key={gi} className="tts-greet">{greet[gi]}</span>
          <br />like your callers do.
        </div>
        <div className="tts-hero-lead">{children}</div>
        <TtsLinks links={links} />
        <div className="tts-stats">
          {stats.map((s) => (
            <div key={s.label} className="tts-stat">
              <div className="tts-label">{s.label}</div>
              <div className="tts-stat-value">{s.value}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="tts-panel">
        <div className="tts-panel-head"><span>{data.languages.length} languages</span><span>Press one to hear it</span></div>
        <div className="tts-hero-langs">
          {data.languages.map((x) => (
            <button key={x.code} type="button" className={x.code === lang ? "on" : ""}
              onClick={() => { setLang(x.code); setGo(true); }} aria-label={"Hear " + x.name}>
              <span className="tts-native">{x.native}</span>
              <span className="tts-sub">{x.name}</span>
              <span className="tts-btn tts-btn-sm"><TtsIcon playing={false} /></span>
            </button>
          ))}
        </div>
        <div className="tts-feature">
          <div className="tts-who"><TtsAvatar name={clip.voice} size={24} /><span>{clip.voice} · {l.name}</span><TtsEq /></div>
          <p className="tts-line"><TtsMarked text={line.text} k={key} /></p>
          {line.gloss && <p className="tts-gloss">{line.gloss}</p>}
          <TtsPlay key={key} src={clip.src} dur={clip.dur} peaks={clip.peaks} label={clip.voice + " " + l.name} autoStart={go} />
        </div>
      </div>
    </div>
  );
};

const TtsSamples = ({ data }) => (
  <div className="tts tts-cards">
    {data.samples.map((s) => (
      <div key={s.id} className="tts-card">
        <div className="tts-card-head">
          <span className="tts-card-title">{s.title}</span>
          <span className="tts-who tts-who-r">
            <span><span className="tts-who-name">{s.voice}</span><span className="tts-sub">{s.language}</span></span>
            <TtsAvatar name={s.voice} size={26} />
          </span>
        </div>
        <p className="tts-line"><TtsMarked text={s.text} k={s.id} /></p>
        {s.gloss && <p className="tts-gloss">{s.gloss}</p>}
        <TtsPlay src={s.src} dur={s.dur} peaks={s.peaks} label={s.title} />
      </div>
    ))}
  </div>
);

const TtsPicker = ({ data }) => {
  const unpod = ttsUnpod(data);
  const [lang, setLang] = useState(data.languages[0].code);
  const [cat, setCat] = useState(data.categories[0].code);
  const [go, setGo] = useState(false);
  const key = lang + "_" + cat;
  const clip = unpod.clips[key];
  const line = data.lines[lang][cat];
  const l = ttsLang(data, lang);
  return (
    <div className="tts tts-picker">
      <div className="tts-panel tts-picker-main">
        <div className="tts-picker-top">
          <div className="tts-who"><TtsAvatar name={clip.voice} size={26} /><span><b>{clip.voice}</b> <span className="tts-sub">· {l.name}</span></span><TtsEq /></div>
          <label className="tts-select">
            <span>Language</span>
            <select value={lang} onChange={(e) => { setLang(e.target.value); setGo(true); }}>
              {data.languages.map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}
            </select>
          </label>
        </div>
        <div className="tts-picker-text">
          <p className="tts-line-big"><TtsMarked text={line.text} k={key} /></p>
          {line.gloss && <p className="tts-gloss">{line.gloss}</p>}
        </div>
        <div className="tts-picker-chips">
          <span className="tts-label">Line</span>
          {data.categories.map((c) => (
            <button key={c.code} type="button" className={c.code === cat ? "tts-chip on" : "tts-chip"}
              onClick={() => { setCat(c.code); setGo(true); }}>{c.name}</button>
          ))}
        </div>
        <div className="tts-picker-foot">
          <TtsPlay key={key} src={clip.src} dur={clip.dur} peaks={clip.peaks} label={clip.voice + " " + l.name} autoStart={go} />
        </div>
      </div>
      <div className="tts-panel tts-picker-side">
        <div className="tts-panel-head"><span>All {data.voices.length} voices</span><span>Press one to hear it</span></div>
        {data.voices.map((v) => (
          <div key={v.id} className="tts-vrow">
            <TtsAvatar name={v.name} size={26} />
            <div>
              <div className="tts-who-name">{v.name}</div>
              <div className="tts-sub">{v.gender} · {v.languages}</div>
            </div>
            <TtsPlay mini src={v.src} dur={v.dur} label={v.name} />
          </div>
        ))}
      </div>
    </div>
  );
};

const TtsOneVoice = ({ data }) => (
  <div className="tts tts-cards">
    {data.oneVoice.map((c) => (
      <div key={c.lang} className="tts-card">
        <div className="tts-card-head">
          <span className="tts-native">{c.native}</span>
          <span className="tts-who tts-who-r">
            <span><span className="tts-who-name">{c.voice}</span><span className="tts-sub">{c.name}</span></span>
            <TtsAvatar name={c.voice} size={26} />
          </span>
        </div>
        <p className="tts-line"><TtsMarked text={c.text} k={c.lang + "_" + data.oneVoiceCat} /></p>
        <TtsPlay src={c.src} dur={c.dur} peaks={c.peaks} label={c.voice + " " + c.name} />
      </div>
    ))}
  </div>
);

// A whole call: one agent voice follows the caller from language to language.
// "Play the call" reveals the turns in order, playing agent turns and pausing on caller turns.
const TtsCall = ({ data }) => {
  const turns = data.call;
  const [shown, setShown] = useState(turns.length);
  const [active, setActive] = useState(-1);
  const [running, setRunning] = useState(false);
  const audio = useRef(null);
  const timer = useRef(null);
  const run = useRef(0);
  const halt = () => {
    run.current += 1;
    if (audio.current) audio.current.pause();
    clearTimeout(timer.current);
  };
  const stop = () => { halt(); setRunning(false); setActive(-1); setShown(turns.length); };
  const step = (i, id) => {
    if (id !== run.current) return;
    if (i >= turns.length) { setRunning(false); setActive(-1); return; }
    setShown(i + 1);
    setActive(i);
    const t = turns[i];
    if (t.who === "agent") {
      const a = new Audio(t.src);
      audio.current = a;
      window.dispatchEvent(new CustomEvent("tts-play", { detail: a }));
      a.onended = () => { timer.current = setTimeout(() => step(i + 1, id), 450); };
      a.play().catch(() => stop());
    } else {
      timer.current = setTimeout(() => step(i + 1, id), 1700);
    }
  };
  const start = () => {
    halt();
    const id = run.current;
    setRunning(true);
    setShown(0);
    step(0, id);
  };
  useEffect(() => {
    const other = (e) => { if (audio.current && e.detail !== audio.current && running) stop(); };
    window.addEventListener("tts-play", other);
    return () => window.removeEventListener("tts-play", other);
  }, [running]);
  useEffect(() => () => halt(), []);
  const path = [];
  turns.forEach((t) => { if (t.who === "agent" && path.indexOf(t.lang) < 0) path.push(t.lang); });
  const curLang = active >= 0 ? turns[active].lang : null;
  const agent = turns.find((t) => t.who === "agent");
  return (
    <div className="tts tts-call">
      <div className="tts-call-head">
        <div className="tts-who">
          <TtsAvatar name={agent.voice} size={36} />
          <div>
            <div className="tts-who-name">{agent.voice} · Unpod agent</div>
            <div className="tts-sub">One voice for the whole call</div>
          </div>
        </div>
        <div className="tts-call-path" aria-label="Languages in this call">
          {path.map((c, i) => (
            <span key={c} className="tts-call-step">
              {i > 0 && <span className="tts-call-arrow">→</span>}
              <span className={c === curLang ? "tts-call-lang on" : "tts-call-lang"}>{ttsLang(data, c).native}</span>
            </span>
          ))}
        </div>
        <button type="button" className={running ? "tts-callbtn on" : "tts-callbtn"} onClick={running ? stop : start}>
          {running ? "Stop" : "Play the call"}
        </button>
      </div>
      <div className="tts-call-body">
        {turns.slice(0, shown).map((t, i) => (
          <div key={i} className={"tts-msg " + t.who + (i === active ? " active" : "")}>
            <div className="tts-msg-meta">
              {t.who === "agent" ? agent.voice : "Caller"} · {ttsLang(data, t.lang).name}
              {t.who === "agent" && <TtsEq />}
            </div>
            <div className="tts-bubble">
              <p><TtsMarked text={t.text} k="" /></p>
              {t.gloss && <p className="tts-gloss">{t.gloss}</p>}
              {t.who === "agent" && !running && (
                <div className="tts-bubble-play"><TtsPlay mini src={t.src} dur={t.dur} label={"Turn " + (i + 1)} /><span className="tts-time">{Math.round(t.dur)}s</span></div>
              )}
            </div>
          </div>
        ))}
        {running && shown < turns.length && turns[shown] && turns[shown].who === "caller" && (
          <div className="tts-msg caller"><div className="tts-bubble tts-typing"><i /><i /><i /></div></div>
        )}
      </div>
    </div>
  );
};

/* ---------- compare ---------- */

const ttsPrice = (p) => (p.usdPer1k == null ? "Not listed" : p.priceInr);

const TtsCompare = ({ data }) => {
  const [lang, setLang] = useState(data.languages[0].code);
  const [cat, setCat] = useState(data.categories[0].code);
  useEffect(() => {
    const go = (e) => { setLang(e.detail.lang); setCat(e.detail.cat); };
    window.addEventListener("tts-goto", go);
    return () => window.removeEventListener("tts-goto", go);
  }, []);
  const key = lang + "_" + cat;
  const line = data.lines[lang][cat];
  return (
    <div className="tts tts-compare" id="tts-compare">
      <div className="tts-compare-bar">
        <div className="tts-tabs" role="tablist" aria-label="Line">
          <span className="tts-label">The line</span>
          {data.categories.map((c) => (
            <button key={c.code} type="button" role="tab" aria-selected={cat === c.code}
              className={cat === c.code ? "on" : ""} onClick={() => setCat(c.code)}>{c.name}</button>
          ))}
        </div>
        <div className="tts-tabs" role="tablist" aria-label="Language">
          <span className="tts-label">Language</span>
          {data.languages.map((l) => (
            <button key={l.code} type="button" role="tab" aria-selected={lang === l.code}
              className={lang === l.code ? "on" : ""} onClick={() => setLang(l.code)}>{l.name}</button>
          ))}
        </div>
      </div>
      <div className="tts-compare-line">
        <p className="tts-line-big"><TtsMarked text={line.text} k={key} /></p>
        {line.gloss && <p className="tts-gloss">{line.gloss}</p>}
      </div>
      <div className="tts-compare-grid">
        {data.providers.map((p) => {
          const clip = p.clips[key];
          const sub = clip ? p.model + " · " + clip.voice : p.model;
          return (
            <div key={p.id} className={p.id === "unpod" ? "tts-pcard ours" : "tts-pcard"}>
              <div className="tts-pname">{p.name}{p.id === "unpod" && <span className="tts-badge">Ours</span>}<TtsEq /></div>
              <div className="tts-sub">{sub}</div>
              <dl className="tts-pmeta">
                <dt>First audio</dt><dd>{p.firstAudioMs != null ? p.firstAudio : "Not timed"}</dd>
                <dt>Per 1K chars</dt><dd>{ttsPrice(p)}</dd>
              </dl>
              {clip ? (
                <TtsPlay src={clip.src} dur={clip.dur} peaks={clip.peaks} label={p.name + " " + clip.voice} />
              ) : (
                <div className="tts-novoice">No voice for this line</div>
              )}
            </div>
          );
        })}
        <div className="tts-pcard tts-note">
          {data.notes.map((n) => <div key={n}>{n}</div>)}
        </div>
      </div>
    </div>
  );
};

const TtsCost = ({ data }) => {
  const units = [
    { code: "min", name: "1 min", chars: 1000 },
    { code: "hour", name: "1 hour", chars: 60000 },
    { code: "1m", name: "1M chars", chars: 1000000 },
    { code: "10m", name: "10M chars", chars: 10000000 },
  ];
  const [unit, setUnit] = useState("hour");
  const [cur, setCur] = useState("INR");
  const u = units.find((x) => x.code === unit);
  const priced = data.providers.filter((p) => p.usdPer1k != null).map((p) => p.usdPer1k);
  const max = Math.max.apply(null, priced);
  const min = Math.min.apply(null, priced);
  const money = (usd) => {
    const v = (usd * u.chars) / 1000;
    if (cur === "USD") return "US$ " + (v < 1 ? v.toFixed(4) : v.toLocaleString("en-US", { maximumFractionDigits: 2 }));
    const r = v * data.inrPerUsd;
    return "₹" + (r < 10 ? r.toFixed(2) : Math.round(r).toLocaleString("en-IN"));
  };
  return (
    <div className="tts">
      <div className="tts-panel">
        <div className="tts-rows-head">
          <span className="tts-label">Cost comparison</span>
          <div className="tts-tabs">
            <span className="tts-label">Price for</span>
            {units.map((x) => (
              <button key={x.code} type="button" className={unit === x.code ? "on" : ""} onClick={() => setUnit(x.code)}>{x.name}</button>
            ))}
            <span className="tts-gap" />
            {["INR", "USD"].map((c) => (
              <button key={c} type="button" className={cur === c ? "on" : ""} onClick={() => setCur(c)}>{c}</button>
            ))}
          </div>
        </div>
        {data.providers.map((p) => {
          const has = p.usdPer1k != null;
          return (
            <div key={p.id} className={p.id === "unpod" ? "tts-row ours" : "tts-row"}>
              <span className="tts-row-name">{p.name}</span>
              <span className="tts-row-model">{p.model}</span>
              <span className="tts-track">
                {has ? <span className="tts-fill" style={{ width: Math.max(2, Math.round((p.usdPer1k / max) * 100)) + "%" }} /> : null}
              </span>
              <span className="n">{has ? money(p.usdPer1k) : "Not listed"}</span>
              <span className="r">{has ? (p.usdPer1k === min ? "lowest" : (p.usdPer1k / min).toFixed(1) + "x lowest") : "—"}</span>
            </div>
          );
        })}
      </div>
      <p className="tts-gloss tts-foot">{data.costNote}</p>
    </div>
  );
};

const TtsLatency = ({ data }) => {
  const ms = (p) => p.firstAudioMs;
  const max = Math.max.apply(null, data.providers.filter((p) => ms(p) != null).map(ms));
  return (
    <div className="tts">
      <div className="tts-panel">
        <div className="tts-rows-head">
          <span className="tts-label">Time to first audio</span>
          <span className="tts-label">Milliseconds, lower is faster</span>
        </div>
        {data.providers.map((p) => (
          <div key={p.id} className={p.id === "unpod" ? "tts-row tts-row-4 ours" : "tts-row tts-row-4"}>
            <span className="tts-row-name">{p.name}</span>
            <span className="tts-row-model">{p.model}</span>
            <span className="tts-track">
              {ms(p) != null ? <span className="tts-fill" style={{ width: Math.round((ms(p) / max) * 100) + "%" }} /> : null}
            </span>
            <span className="n">{ms(p) != null ? p.firstAudio : "Not timed"}</span>
          </div>
        ))}
      </div>
      <p className="tts-gloss tts-foot">
        Median over the same {data.categories.length * data.languages.length} lines on each provider's streaming HTTP API, measured by us on {data.recorded}.
        {data.latencyNote ? " " + data.latencyNote : ""}
      </p>
    </div>
  );
};

const TTS_SLIPS = [
  { title: "Long numbers", lang: "en", cat: "travel", typed: "PNR 4521876390, train 12952",
    body: "A PNR is something the caller writes down. It has to come out in short groups at a steady pace, not as one huge number or a blur of digits.",
    listen: "the PNR in short groups of digits, and the train number as a train number" },
  { title: "Addresses and pincodes", lang: "en", cat: "delivery", typed: "flat B-1204 … pincode 560066",
    body: "A delivery address mixes letters, numbers and place names. A flat number is not an amount, and a pincode is six separate digits.",
    listen: "B twelve oh four, and five six zero zero six six" },
  { title: "Dates and percentages", lang: "en", cat: "insurance", typed: "15/03/2027 · 12.5%",
    body: "Slashes and decimals trip up most voices. A date should sound like a date and a percentage should keep its point.",
    listen: "fifteenth March twenty twenty-seven, and twelve point five percent" },
  { title: "English inside Hindi", lang: "hi", cat: "insurance", typed: "health policy … UPI या NEFT",
    body: "Indian callers switch to English for words like policy, premium and UPI. Those words should keep their English sound inside a Hindi line.",
    listen: "health policy, premium, UPI and NEFT in English, the rest in Hindi" },
];

const TtsSlips = ({ data }) => {
  const goto = (s) => {
    window.dispatchEvent(new CustomEvent("tts-goto", { detail: { lang: s.lang, cat: s.cat } }));
    const el = document.getElementById("tts-compare");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const lineName = (code) => data.categories.find((c) => c.code === code).name;
  return (
    <div className="tts tts-cards tts-cards-4">
      {TTS_SLIPS.map((s) => (
        <div key={s.title} className="tts-card">
          <div className="tts-card-title tts-card-title-lg">{s.title}</div>
          <p className="tts-gloss">{s.body}</p>
          <div className="tts-kv">
            <div className="tts-label">Typed</div>
            <div className="tts-kv-val">{s.typed}</div>
            <div className="tts-label">Listen for</div>
            <div>{s.listen}</div>
          </div>
          <button type="button" className="tts-link" onClick={() => goto(s)}>
            Go to the line: {lineName(s.cat)}, {ttsLang(data, s.lang).name}
          </button>
        </div>
      ))}
    </div>
  );
};

export const Tts = (props) => {
  const v = props.view;
  if (v === "hero") return <TtsHero {...props} />;
  if (v === "eyebrow") return <TtsEyebrow {...props} />;
  if (v === "band") return <TtsBand {...props} />;
  if (v === "samples") return <TtsSamples {...props} />;
  if (v === "picker") return <TtsPicker {...props} />;
  if (v === "call") return <TtsCall {...props} />;
  if (v === "one-voice") return <TtsOneVoice {...props} />;
  if (v === "compare") return <TtsCompare {...props} />;
  if (v === "cost") return <TtsCost {...props} />;
  if (v === "latency") return <TtsLatency {...props} />;
  if (v === "slips") return <TtsSlips {...props} />;
  return null;
};
