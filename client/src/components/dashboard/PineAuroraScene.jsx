import { useMemo } from "react";

/* Bộ random có seed để cảnh luôn giống nhau mỗi lần render */
function rng(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Một cây thông: nhiều tầng cành cong, đầu cành rủ xuống, hơi lệch nhau cho tự nhiên */
function pinePath(x, base, h, w, tiers, rand) {
  const top = base - h * 0.98;
  const step = (h * 0.9) / tiers;
  const f = (n) => n.toFixed(1);
  const nodes = []; // mỗi node: điểm [dx, y] + điểm điều khiển [cx, cy] để tới được nó

  // ngọn thông nhọn, mảnh
  nodes.push({ p: [w * 0.035, top + step * 0.9], c: [w * 0.012, top + step * 0.4] });

  let prev = nodes[0].p;
  for (let i = 0; i < tiers; i++) {
    const t = (i + 1) / tiers;
    const jitter = 0.88 + rand() * 0.24;
    const hw = (w / 2) * (0.22 + 0.78 * Math.pow(t, 0.92)) * jitter;
    const y = top + step * 0.9 + step * (i + 1) * 0.98;
    const tipY = y + step * 0.18; // đầu cành rủ thấp hơn
    // cành đi ra: hơi võng, rồi rủ xuống đầu cành
    nodes.push({ p: [hw, tipY], c: [hw * 0.62, y - step * 0.5] });
    // mặt dưới cành cuộn lại về thân
    nodes.push({
      p: [hw * 0.24, y - step * 0.12],
      c: [hw * 0.62, tipY + step * 0.12],
    });
    prev = nodes[nodes.length - 1].p;
  }
  void prev;

  const tw = w * 0.045;
  let d = `M${f(x)} ${f(top)}`;
  for (const n of nodes) d += ` Q${f(x + n.c[0])} ${f(n.c[1])} ${f(x + n.p[0])} ${f(n.p[1])}`;
  d += ` L${f(x + tw)} ${base} L${f(x - tw)} ${base}`;
  const last = nodes[nodes.length - 1];
  d += ` L${f(x - last.p[0])} ${f(last.p[1])}`;
  for (let k = nodes.length - 1; k >= 1; k--) {
    const to = nodes[k - 1].p;
    const ctrl = nodes[k].c;
    d += ` Q${f(x - ctrl[0])} ${f(ctrl[1])} ${f(x - to[0])} ${f(to[1])}`;
  }
  return d + " Z";
}

/* Một lớp rừng: nhiều cây với kích thước ngẫu nhiên */
function buildForest({ seed, count, minH, maxH, base, width = 1600 }) {
  const rand = rng(seed);
  let d = "";
  for (let i = 0; i < count; i++) {
    const x = (i / (count - 1)) * width + (rand() - 0.5) * (width / count) * 1.5;
    const h = minH + rand() * (maxH - minH);
    const w = h * (0.42 + rand() * 0.12);
    const tiers = 9 + Math.floor(rand() * 4);
    d += pinePath(x, base, h, w, tiers, rand) + " ";
  }
  /* nền đất liền mạch phía dưới các cây */
  d += `M0 ${base - 6} L${width} ${base - 6} L${width} ${base + 2} L0 ${base + 2} Z`;
  return d;
}

const STAR_COUNT = 46;
const FIREFLY_COUNT = 9;

export default function PineAuroraScene() {
  const forest = useMemo(
    () => ({
      far: buildForest({ seed: 11, count: 40, minH: 65, maxH: 115, base: 200 }),
      mid: buildForest({ seed: 27, count: 28, minH: 85, maxH: 140, base: 200 }),
      near: buildForest({ seed: 53, count: 17, minH: 110, maxH: 175, base: 200 }),
    }),
    []
  );

  const stars = useMemo(() => {
    const r = rng(7);
    return Array.from({ length: STAR_COUNT }, () => ({
      left: `${(r() * 100).toFixed(1)}%`,
      top: `${(r() * 62).toFixed(1)}%`,
      size: (1 + r() * 1.6).toFixed(1),
      delay: `${(r() * 6).toFixed(1)}s`,
      dur: `${(3 + r() * 4).toFixed(1)}s`,
    }));
  }, []);

  const fireflies = useMemo(() => {
    const r = rng(91);
    return Array.from({ length: FIREFLY_COUNT }, () => ({
      left: `${(4 + r() * 92).toFixed(1)}%`,
      bottom: `${(6 + r() * 28).toFixed(1)}%`,
      dx: `${((r() - 0.5) * 70).toFixed(0)}px`,
      dy: `${(-10 - r() * 34).toFixed(0)}px`,
      delay: `${(r() * 8).toFixed(1)}s`,
      dur: `${(7 + r() * 6).toFixed(1)}s`,
    }));
  }, []);

  return (
    <div className="pd-scene" aria-hidden="true">
      <div className="pd-scene-sky" />

      <div className="pd-scene-stars">
        {stars.map((s, i) => (
          <span
            key={i}
            className="pd-star"
            style={{
              left: s.left,
              top: s.top,
              width: `${s.size}px`,
              height: `${s.size}px`,
              animationDelay: s.delay,
              animationDuration: s.dur,
            }}
          />
        ))}
      </div>

      {/* Cực quang: 3 dải sáng mềm + tia rèm lung linh */}
      <div className="pd-aurora">
        <svg className="pd-aurora-band pd-aurora-a" viewBox="0 0 1200 300" preserveAspectRatio="none">
          <defs>
            <linearGradient id="pdAuA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#34d399" stopOpacity="0" />
              <stop offset="0.55" stopColor="#34d399" stopOpacity="0.75" />
              <stop offset="1" stopColor="#2dd4bf" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            fill="url(#pdAuA)"
            d="M0 150 C150 80 300 190 450 130 S750 60 900 130 S1100 170 1200 100 L1200 230 C1050 280 900 190 750 245 S450 285 300 225 S100 270 0 215 Z"
          />
        </svg>
        <svg className="pd-aurora-band pd-aurora-b" viewBox="0 0 1200 300" preserveAspectRatio="none">
          <defs>
            <linearGradient id="pdAuB" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#a78bfa" stopOpacity="0" />
              <stop offset="0.5" stopColor="#c084fc" stopOpacity="0.6" />
              <stop offset="1" stopColor="#f472b6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            fill="url(#pdAuB)"
            d="M0 110 C200 50 350 150 520 90 S800 30 980 95 S1130 120 1200 70 L1200 190 C1020 235 880 150 700 205 S380 240 230 185 S80 220 0 170 Z"
          />
        </svg>
        <svg className="pd-aurora-band pd-aurora-c" viewBox="0 0 1200 300" preserveAspectRatio="none">
          <defs>
            <linearGradient id="pdAuC" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#38bdf8" stopOpacity="0" />
              <stop offset="0.6" stopColor="#38bdf8" stopOpacity="0.5" />
              <stop offset="1" stopColor="#818cf8" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            fill="url(#pdAuC)"
            d="M0 170 C180 120 330 210 500 160 S820 110 1000 170 S1140 190 1200 140 L1200 250 C1040 290 900 220 720 265 S400 295 250 250 S90 285 0 240 Z"
          />
        </svg>
        <div className="pd-aurora-rays pd-aurora-rays-1" />
        <div className="pd-aurora-rays pd-aurora-rays-2" />
      </div>

      {/* Vầng sáng cuối chiều ở chân trời */}
      <div className="pd-scene-horizon" />

      {/* Rừng thông 3 lớp, mỗi lớp đung đưa nhẹ theo nhịp riêng */}
      <svg className="pd-forest pd-forest-far" viewBox="0 0 1600 200" preserveAspectRatio="xMidYMax slice">
        <path d={forest.far} />
      </svg>
      <div className="pd-mist pd-mist-1" />
      <svg className="pd-forest pd-forest-mid" viewBox="0 0 1600 200" preserveAspectRatio="xMidYMax slice">
        <path d={forest.mid} />
      </svg>
      <div className="pd-mist pd-mist-2" />
      <svg className="pd-forest pd-forest-near" viewBox="0 0 1600 200" preserveAspectRatio="xMidYMax slice">
        <path d={forest.near} />
      </svg>

      <div className="pd-fireflies">
        {fireflies.map((f, i) => (
          <span
            key={i}
            className="pd-firefly"
            style={{
              left: f.left,
              bottom: f.bottom,
              "--dx": f.dx,
              "--dy": f.dy,
              animationDelay: f.delay,
              animationDuration: f.dur,
            }}
          />
        ))}
      </div>
    </div>
  );
}