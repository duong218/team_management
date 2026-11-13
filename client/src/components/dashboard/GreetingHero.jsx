import { useEffect, useState } from "react";
import { Clock3, Sparkles } from "lucide-react";
import "../../styles/greeting-hero.css";

/* Hero chào mừng có cảnh động theo giờ thật của máy:
   4h–14h chào buổi sáng (đồng cỏ) · 14h–20h chào buổi chiều (hoàng hôn) · 20h–4h chào buổi tối (đêm tuyết).
   Dùng: <GreetingHero name="Dương" stats={[{ icon: <Folder />, value: 2, label: "Công việc của bạn", tone: "blue" }]} />
   Prop `hour` (0–24) chỉ để xem thử một khung giờ. */

const phaseOf = (h) => (h >= 4 && h < 14 ? "day" : h >= 14 && h < 20 ? "dusk" : "night");
const GREET = { day: "Chào buổi sáng", dusk: "Chào buổi chiều", night: "Chào buổi tối" };
const SUB = {
  day: "Chọn một công việc để bắt đầu, hoặc tạo công việc mới cho nhóm.",
  dusk: "Chiều rồi, chốt nốt vài việc rồi nghỉ ngơi thôi nhé.",
  night: "Tối rồi, nhớ nghỉ ngơi nhé. Việc mai làm tiếp cũng kịp mà.",
};

// Số giả ngẫu nhiên cố định: cảnh giống nhau mỗi lần render, không giật.
const rnd = (i) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const sw = (d) => ({ "--d": `${d}s` });

function VietnamClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const time = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Asia/Ho_Chi_Minh" }).format(now);
  return <div className="gh-clock" aria-label={`Giờ Việt Nam ${time}`}><Clock3 size={15} aria-hidden="true" /><span>Giờ Việt Nam</span><time dateTime={now.toISOString()}>{time}</time></div>;
}

/* ---------- Dữ liệu cảnh ---------- */
const GRASS = Array.from({ length: 48 }, (_, i) => ({
  x: 6 + i * 25 + rnd(i) * 14, y: 286 + rnd(i + 50) * 12, s: 0.7 + rnd(i + 9) * 0.7, d: -rnd(i + 3) * 5, alt: i % 2,
}));
const FLOWER_COLORS = ["#ff8fb8", "#ffd166", "#ffffff", "#b79cff", "#ff9f80"];
const FLOWERS = Array.from({ length: 17 }, (_, i) => ({
  x: 30 + i * 70 + rnd(i + 20) * 40, y: 284 + rnd(i + 70) * 11, h: 22 + rnd(i + 5) * 16, c: FLOWER_COLORS[i % 5], d: -rnd(i + 8) * 4,
})).sort((a, b) => a.y - b.y);
const TREES = [[110, 252, 1.15], [300, 250, 0.8], [650, 245, 0.85], [880, 240, 0.95], [1085, 248, 1.1]];
const FIREFLIES = Array.from({ length: 12 }, (_, i) => ({ x: 60 + rnd(i + 30) * 1080, y: 190 + rnd(i + 40) * 90, d: -rnd(i) * 6, t: 4 + rnd(i + 2) * 3 }));
const STARS = Array.from({ length: 34 }, (_, i) => ({ x: rnd(i + 60) * 1200, y: 78 + rnd(i + 90) * 110, r: 0.8 + rnd(i + 11) * 1.1, d: -rnd(i + 4) * 4, t: 2.5 + rnd(i + 6) * 2.5 }));
const FLAKES = Array.from({ length: 38 }, (_, i) => ({ x: rnd(i + 120) * 1200, r: 0.9 + rnd(i + 7) * 1.5, t: 7 + rnd(i + 13) * 8, d: -rnd(i + 17) * 14, dx: (rnd(i + 19) - 0.5) * 50 }));
const PINES = [[430, 272, 1], [470, 277, 0.72], [905, 268, 1.05], [965, 275, 0.8], [1100, 270, 1.1], [60, 277, 0.9]];
const PETALS = [0, 72, 144, 216, 288];

/* ---------- Mảnh nhỏ dùng lại ---------- */
const Cloud = ({ x, y, s, t, d }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <g className="cloud" style={{ "--t": `${t}s`, ...sw(d) }}>
      <ellipse cx="40" cy="26" rx="40" ry="13" /><circle cx="28" cy="16" r="14" /><circle cx="52" cy="12" r="17" />
    </g>
  </g>
);
const Tree = ({ x, y, s, d }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x="-4" y="-36" width="8" height="38" rx="3" fill="#a9764f" />
    <g className="sway sway-tree" style={sw(d)}>
      <circle cx="0" cy="-52" r="22" fill="#47b559" /><circle cx="-15" cy="-40" r="15" fill="#3fa84f" />
      <circle cx="15" cy="-42" r="16" fill="#54c767" /><circle cx="-4" cy="-60" r="12" fill="#5fd172" opacity=".9" />
    </g>
  </g>
);
const Flower = ({ x, y, h, c, d }) => (
  <g transform={`translate(${x} ${y})`}>
    <g className="sway" style={sw(d)}>
      <path d={`M0 0 Q${h * 0.12} ${-h * 0.5} 0 ${-h}`} stroke="#2f9a4a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d={`M0 ${-h * 0.45} q8 -2 10 -9 q-8 0 -10 9z`} fill="#3fae52" />
      <g transform={`translate(0 ${-h})`}>
        {PETALS.map((a) => <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 4.6} cy={Math.sin((a * Math.PI) / 180) * 4.6} r="3.6" fill={c} />)}
        <circle r="2.6" fill="#ffd54a" />
      </g>
    </g>
  </g>
);
const Butterfly = ({ x, y, c, t, d }) => (
  <g transform={`translate(${x} ${y})`}>
    <g className="fly" style={{ "--t": `${t}s`, ...sw(d) }}>
      <g className="wing"><ellipse cx="-5" cy="-3" rx="6" ry="4.5" fill={c} transform="rotate(-25 -5 -3)" /><ellipse cx="-4" cy="3" rx="4" ry="3.2" fill={c} opacity=".85" /></g>
      <g className="wing"><ellipse cx="5" cy="-3" rx="6" ry="4.5" fill={c} transform="rotate(25 5 -3)" /><ellipse cx="4" cy="3" rx="4" ry="3.2" fill={c} opacity=".85" /></g>
      <rect x="-.8" y="-4" width="1.6" height="8" rx=".8" fill="#4a3b6b" />
    </g>
  </g>
);
const Pine = ({ x, y, s, d }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x="-3" y="-14" width="6" height="16" fill="#5a3f3a" />
    <g className="sway sway-pine" style={sw(d)}>
      <path d="M0 -58 L-28 -14 H28Z" fill="#255651" /><path d="M0 -76 L-22 -40 H22Z" fill="#2a5f5b" /><path d="M0 -92 L-16 -62 H16Z" fill="#2c6b63" />
      <path d="M0 -92 L-8 -77 L-3 -80 L0 -76 L4 -80 L8 -77Z" fill="#fff" />
      <path d="M0 -76 L-11 -58 L-5 -62 L0 -57 L5 -62 L11 -58Z" fill="#fff" />
      <path d="M0 -58 L-14 -35 L-6 -41 L0 -34 L6 -41 L14 -35Z" fill="#fff" />
    </g>
  </g>
);

/* ---------- Cảnh ngày / hoàng hôn ---------- */
function DayScene({ dusk }) {
  return (
    <svg className={`gh-scene ${dusk ? "is-dusk" : "is-day"}`} viewBox="0 0 1200 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="ghHb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b8e986" /><stop offset="1" stopColor="#8fd16a" /></linearGradient>
        <linearGradient id="ghHm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8bd36b" /><stop offset="1" stopColor="#5fbf5a" /></linearGradient>
        <linearGradient id="ghHf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6fcf64" /><stop offset="1" stopColor="#3fae52" /></linearGradient>
        <radialGradient id="ghSg"><stop offset=".35" style={{ stopColor: "var(--sun-glow)", stopOpacity: 0.85 }} /><stop offset="1" style={{ stopColor: "var(--sun-glow)", stopOpacity: 0 }} /></radialGradient>
      </defs>
      <g transform={`translate(545 ${dusk ? 200 : 110})`}>
        <g className={dusk ? "sun-pos is-low" : "sun-pos"}>
          <circle className="sun-glow" r="74" fill="url(#ghSg)" />
          <g className="sun-rays">{Array.from({ length: 12 }, (_, i) => <rect key={i} x="-3" y="-50" width="6" height="14" rx="3" transform={`rotate(${i * 30})`} />)}</g>
          <circle className="sun-core" r="30" />
        </g>
      </g>
      <g className="clouds"><Cloud x={330} y={124} s={1} t={22} d={0} /><Cloud x={680} y={162} s={0.7} t={30} d={-8} /><Cloud x={920} y={112} s={0.9} t={26} d={-14} /></g>
      <g className="land">
        <path d="M0 232 C150 196 300 206 450 228 S750 196 900 218 S1100 204 1200 220 V300 H0Z" fill="url(#ghHb)" />
        <path d="M0 258 C200 230 380 254 560 249 S900 228 1200 252 V300 H0Z" fill="url(#ghHm)" />
        {TREES.map(([x, y, s], i) => <Tree key={x} x={x} y={y} s={s} d={-i * 1.3} />)}
        <path d="M0 282 C250 264 450 284 700 274 S1050 260 1200 277 V300 H0Z" fill="url(#ghHf)" />
        {GRASS.map((g, i) => (
          <g key={i} transform={`translate(${g.x} ${g.y}) scale(${g.s})`}>
            <g className="sway" style={sw(g.d)}><path d="M-5 0 Q-6 -10 -9 -20 Q-2 -12 -1 0Z M-1 0 Q0 -14 3 -26 Q4 -12 3 0Z M3 0 Q6 -9 11 -17 Q7 -8 7 0Z" fill={g.alt ? "#2f9a4a" : "#58c765"} /></g>
          </g>
        ))}
        {FLOWERS.map((f, i) => <Flower key={i} {...f} />)}
      </g>
      <Butterfly x={420} y={226} c="#ff8fb8" t={16} d={0} />
      <Butterfly x={760} y={214} c="#ffd166" t={20} d={-7} />
      {dusk && FIREFLIES.map((f, i) => <circle key={i} className="firefly" cx={f.x} cy={f.y} r="2.2" style={{ "--t": `${f.t}s`, ...sw(f.d) }} />)}
    </svg>
  );
}

/* ---------- Cảnh đêm tuyết ---------- */
function NightScene() {
  return (
    <svg className="gh-scene is-night" viewBox="0 0 1200 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="ghM1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5560b0" /><stop offset="1" stopColor="#343a80" /></linearGradient>
        <linearGradient id="ghM2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3f4590" /><stop offset="1" stopColor="#2b2f6e" /></linearGradient>
        <linearGradient id="ghSn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f6f8ff" /><stop offset="1" stopColor="#cdd6f8" /></linearGradient>
        <radialGradient id="ghMh"><stop offset=".4" stopColor="#fff7d6" stopOpacity=".42" /><stop offset="1" stopColor="#fff7d6" stopOpacity="0" /></radialGradient>
        <linearGradient id="ghAu" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#5df2c0" stopOpacity="0" /><stop offset=".35" stopColor="#5df2c0" /><stop offset=".7" stopColor="#b48cff" /><stop offset="1" stopColor="#b48cff" stopOpacity="0" /></linearGradient>
      </defs>
      <path className="aurora" d="M-60 120 C150 60 300 160 500 100 S850 60 1260 120 L1260 160 C900 110 700 190 500 150 S150 100 -60 170Z" fill="url(#ghAu)" />
      {STARS.map((s, i) => <circle key={i} className="star" cx={s.x} cy={s.y} r={s.r} style={{ "--t": `${s.t}s`, ...sw(s.d) }} />)}
      <g transform="translate(560 112)"><g className="moon-pos">
        <circle className="moon-halo" r="80" fill="url(#ghMh)" />
        <circle r="30" fill="#fff7d6" /><circle cx="-9" cy="-6" r="6" fill="#f0e6b8" /><circle cx="10" cy="8" r="4.5" fill="#f0e6b8" /><circle cx="6" cy="-14" r="3" fill="#f0e6b8" />
      </g></g>
      <path d="M0 250 L110 178 L190 220 L300 140 L410 226 L520 182 L640 238 L760 158 L880 232 L1000 150 L1120 222 L1200 190 V300 H0Z" fill="url(#ghM1)" />
      <g fill="#eef2ff">
        <path d="M110 178 L94 196 L104 192 L110 200 L118 192 L128 198Z" /><path d="M300 140 L278 168 L290 162 L300 174 L311 162 L324 170Z" />
        <path d="M520 182 L505 198 L514 194 L520 202 L527 194 L536 199Z" /><path d="M760 158 L738 184 L750 178 L760 190 L771 178 L784 186Z" />
        <path d="M1000 150 L978 176 L990 170 L1000 182 L1011 170 L1024 178Z" />
      </g>
      <path d="M0 268 L90 232 L170 258 L270 224 L380 262 L500 236 L610 266 L740 230 L860 264 L990 234 L1100 262 L1200 240 V300 H0Z" fill="url(#ghM2)" />
      <path d="M0 272 C200 247 400 277 620 264 S1000 247 1200 270 V300 H0Z" fill="url(#ghSn)" />
      {PINES.map(([x, y, s], i) => <Pine key={x} x={x} y={y} s={s} d={-i * 1.1} />)}
      {/* nhà gỗ */}
      <g transform="translate(840 272)">
        <circle className="smoke" cx="13" cy="-48" r="4" /><circle className="smoke s2" cx="13" cy="-48" r="4" /><circle className="smoke s3" cx="13" cy="-48" r="4" />
        <rect x="9" y="-46" width="8" height="14" fill="#8a5a4a" />
        <rect x="-22" y="-26" width="44" height="26" rx="2" fill="#7a4b3a" />
        <path d="M-29 -24 L0 -47 L29 -24Z" fill="#cf5c5c" /><path d="M-29 -24 L0 -47 L29 -24 L24 -24 L0 -42 L-24 -24Z" fill="#fff" />
        <circle className="win-glow" cx="-3" cy="-13" r="13" /><rect className="win" x="-9" y="-19" width="12" height="11" rx="2" />
      </g>
      {/* cây trơ cành có vẹt */}
      <g>
        <path d="M545 276 L545 214" stroke="#5b4033" strokeWidth="6" strokeLinecap="round" />
        <path d="M545 236 Q566 224 592 226" stroke="#5b4033" strokeWidth="4" strokeLinecap="round" fill="none" />
        <path d="M549 232 Q566 222 590 224" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        <g transform="translate(579 226)">
          <ellipse cx="-6" cy="12" rx="4" ry="15" fill="#3b8cff" transform="rotate(14 -6 12)" /><ellipse cx="-1" cy="13" rx="3.4" ry="14" fill="#ff5d6c" transform="rotate(4 -1 13)" />
          <ellipse cx="0" cy="-16" rx="12" ry="18" fill="#ff5d6c" /><ellipse cx="3" cy="-11" rx="7" ry="11" fill="#ff9aa2" />
          <g className="parrot-wing"><path d="M-10 -24 q-8 16 2 28 q11 -9 10 -24z" fill="#3b8cff" /><path d="M-8 -2 q-3 5 0 8 q4 -2 3 -8z" fill="#ffd84d" /></g>
          <g className="parrot-head">
            <circle cx="0" cy="-38" r="10.5" fill="#ff5d6c" /><ellipse cx="4" cy="-38" rx="6.5" ry="5.5" fill="#fff" />
            <g className="blink"><circle cx="5" cy="-39" r="2.2" fill="#2a2f55" /><circle cx="5.7" cy="-39.8" r=".7" fill="#fff" /></g>
            <path d="M9 -42 q11 1 8 11 q-3 -4 -8 -3z" fill="#fbe7c6" /><circle cx="-3" cy="-33" r="2.4" fill="#ff8d96" opacity=".7" />
          </g>
          <path d="M-3 0 v4 M3 0 v4" stroke="#7a5a3a" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      </g>
      {/* sói hú trăng */}
      <g transform="translate(700 274)"><g className="wolf-pos"><g className="wolf-flip" transform="scale(-1.05 1.05)">
        <ellipse cx="2" cy="1" rx="26" ry="4" fill="#3a3f86" opacity=".28" />
        <g className="wolf-body">
          <g className="wolf-tail"><path d="M-16 -8 C-42 -6 -46 -32 -30 -36 C-34 -23 -26 -15 -13 -15Z" fill="#8c97b8" /></g>
          <ellipse cx="0" cy="-22" rx="20" ry="24" fill="#8d99bd" /><ellipse cx="7" cy="-18" rx="9" ry="15" fill="#e8edff" />
          <ellipse cx="-11" cy="-7" rx="12" ry="9" fill="#7f8bb0" />
          <rect x="3" y="-14" width="8" height="14" rx="4" fill="#9aa5c7" /><ellipse cx="9" cy="0" rx="6" ry="2.6" fill="#e8edff" />
          <g className="wolf-head">
            <path d="M-2 -62 L3 -78 L13 -64Z" fill="#8d99bd" /><path d="M11 -64 L21 -75 L24 -59Z" fill="#8d99bd" />
            <path d="M1 -64 L4 -73 L9 -65Z" fill="#ffc2d6" />
            <circle cx="10" cy="-52" r="14" fill="#9aa5c7" />
            <ellipse cx="22" cy="-58" rx="11" ry="6" fill="#e8edff" transform="rotate(-38 22 -58)" />
            <circle cx="30" cy="-65" r="2.6" fill="#2a2f55" />
            <path d="M5 -54 q3 -3.5 6 0" stroke="#2a2f55" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            <circle cx="3" cy="-47" r="3" fill="#ff9fbd" opacity=".55" />
            <g transform="translate(34 -68)">
              <path className="wave" d="M0 0 q7 -2 9 -10" /><path className="wave w2" d="M0 0 q7 -2 9 -10" /><path className="wave w3" d="M0 0 q7 -2 9 -10" />
            </g>
          </g>
        </g>
      </g></g></g>
      <path d="M0 292 C300 277 600 297 900 284 S1100 278 1200 290 V300 H0Z" fill="#fff" opacity=".96" />
      {FLAKES.map((f, i) => <circle key={i} className="flake" cx={f.x} cy="0" r={f.r} style={{ "--t": `${f.t}s`, "--dx": `${f.dx}px`, ...sw(f.d) }} />)}
    </svg>
  );
}

/* ---------- Component chính ---------- */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function GreetingHero({ name = "bạn", subtitle, stats = [], hour }) {
  const now = useNow();
  const h = hour ?? now.getHours() + now.getMinutes() / 60;
  const phase = phaseOf(h);
  return (
    <section className="gh" data-phase={phase} aria-label="Chào mừng">
      {phase === "night" ? <NightScene key="n" /> : <DayScene key={phase} dusk={phase === "dusk"} />}
      <div className="gh-body">
        <div className="gh-text">
          <p className="gh-eyebrow"><Sparkles size={16} strokeWidth={2.2} aria-hidden="true" /> KHÔNG GIAN CỦA BẠN</p>
          <h1>{GREET[phase]}, {name}!</h1>
          <p className="gh-sub">{subtitle ?? SUB[phase]}</p>
        </div>
        {stats.length > 0 && (
          <div className="gh-stat-panel">
          <ul className="gh-stats">
            {stats.map((s, i) => (
              <li key={s.label} className={`gh-stat tone-${s.tone || "violet"}`} style={{ "--i": i }}>
                <span className="gh-stat-ico" aria-hidden="true">{s.icon}</span>
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </li>
            ))}
          </ul>
          <VietnamClock />
          </div>
        )}
      </div>
    </section>
  );
}
