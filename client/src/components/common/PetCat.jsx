import { useEffect, useRef, useState } from "react";
import "../../styles/pet.css";
import { PETS, usePet } from "./petSprites";

// Mèo thú cưng cho giao diện máy tính: tự đi, nhảy, ngồi, ngủ; giữ chuột để bế lên, thả ra thì rơi xuống.
// Chỉ chạy transform (compositor); tắt hành vi tự động khi người dùng chọn giảm chuyển động.
const GRAV = 2200;
const FALLBACK = { fall: "jump", jump: "sit", land: "sit", held: "sit", sleep: "sit", walk: "sit" };
const pick = (S, k) => S[k] || (FALLBACK[k] && pick(S, FALLBACK[k])) || null;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const DESKTOP = "(min-width: 881px) and (hover: hover) and (pointer: fine)";

export default function PetCat() {
  const [on, setOn] = useState(() => matchMedia(DESKTOP).matches);
  const [id] = usePet(), SPRITES = PETS[id]; // "none" thì không có pet nào
  const [W, H] = SPRITES?.size || [72, 56];
  const box = useRef(null);
  useEffect(() => {
    const mq = matchMedia(DESKTOP);
    const f = () => setOn(mq.matches);
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);

  useEffect(() => {
    if (!on || !SPRITES) return;
    const el = box.current;
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ground = () => innerHeight - H - 6;
    let x = innerWidth - 220, y = ground(), vx = 0, vy = 0, dir = -1, rot = 0, target = x;
    let state = "", held = false, timer = 0, raf = 0, last = performance.now();
    let grab = { x: 0, y: 0 }, down = null, p = null, sayT = 0;

    const set = (s) => { state = s; el.dataset.s = s; };
    const later = (fn, ms) => { clearTimeout(timer); timer = setTimeout(fn, ms); };
    const think = () => {
      if (held) return;
      const r = Math.random();
      if (calm || r < 0.3) { set("sit"); later(think, rand(2500, 5000)); }
      else if (r < 0.6) { target = rand(10, innerWidth - W - 10); dir = target > x ? 1 : -1; set("walk"); }
      else if (r < 0.8) { set("sleep"); later(think, rand(7000, 12000)); }
      else { dir = Math.random() < 0.5 ? -1 : 1; vy = -700; vx = dir * 70; set("jump"); }
    };
    const paint = () => {
      el.style.transform = `translate3d(${x}px,${y}px,0)`;
      el.style.setProperty("--dir", dir);
      el.style.setProperty("--rot", `${rot}deg`);
    };
    const tick = (t) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      if (!held) {
        const g = ground();
        if (state === "walk") {
          x += dir * 80 * dt;
          if ((dir > 0 && x >= target) || (dir < 0 && x <= target)) think();
        }
        if (y < g || vy < 0) {
          vy += GRAV * dt; y += vy * dt; x += vx * dt;
          if (y >= g) {
            const hard = vy > 500;
            y = g; vy = 0; vx = 0;
            if (hard) { set("land"); later(think, 260); } else think();
          }
        } else y = g;
        x = clamp(x, 0, innerWidth - W);
        rot += (0 - rot) * Math.min(1, dt * 10); // đung đưa tắt dần sau khi thả
      }
      paint();
      raf = requestAnimationFrame(tick);
    };

    const onDown = (e) => {
      if (e.button) return;
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      held = true; clearTimeout(timer);
      grab = { x: e.clientX - x, y: e.clientY - y };
      el.style.setProperty("--ox", `${grab.x}px`);
      el.style.setProperty("--oy", `${grab.y}px`);
      down = { t: e.timeStamp, x: e.clientX, y: e.clientY };
      p = { x: e.clientX, y: e.clientY, t: e.timeStamp, vx: 0, vy: 0 };
      vx = vy = 0;
      set("held");
    };
    const onMove = (e) => {
      if (!held) return;
      const dt = Math.max(0.001, (e.timeStamp - p.t) / 1000);
      p.vx += ((e.clientX - p.x) / dt - p.vx) * 0.4; // lọc nhiễu vận tốc
      p.vy += ((e.clientY - p.y) / dt - p.vy) * 0.4;
      p.x = e.clientX; p.y = e.clientY; p.t = e.timeStamp;
      x = clamp(e.clientX - grab.x, -W / 2, innerWidth - W / 2);
      y = clamp(e.clientY - grab.y, 0, innerHeight - H);
      rot = clamp(p.vx * 0.02, -30, 30); // bế đi nhanh thì đu đưa theo hướng kéo
      if (Math.abs(p.vx) > 120) dir = p.vx > 0 ? 1 : -1;
    };
    const onUp = (e) => {
      if (!held) return;
      held = false;
      const tap = e.timeStamp - down.t < 250 && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5;
      vx = clamp(p.vx, -600, 600); vy = clamp(p.vy, -600, 300);
      if (tap) { clearTimeout(sayT); el.dataset.say = "1"; sayT = setTimeout(() => delete el.dataset.say, 1400); }
      set("fall"); // rơi xuống đất, chạm đất thì tự chuyển trạng thái
      if (y >= ground()) think();
    };
    set("sit");
    later(think, 1500);
    raf = requestAnimationFrame(tick);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      cancelAnimationFrame(raf); clearTimeout(timer); clearTimeout(sayT);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, [on, SPRITES, W, H]);

  if (!on || !SPRITES) return null;
  return (
    <div className="pet" ref={box} aria-hidden="true" style={{ width: W, height: H, "--face": SPRITES?.facing || 1 }}>
      <span className="pet-say">{SPRITES.say}</span>
      <div className="pet-sw"><div className="pet-in">
        {SPRITES ? ["sit", "walk", "sleep", "jump", "fall", "land", "held"].map((k) => {
          const a = pick(SPRITES, k);
          if (!a) return null;
          const n = a.frames || 1;
          return <div key={k} className={`spr spr-${k}${n > 1 ? " anim" : ""}`}
            style={{ width: W, height: H, backgroundImage: `url(${a.src})`, backgroundSize: `${W * n}px ${H}px`, "--sw": `${-W * n}px`, "--n": n, "--dur": `${n / (a.fps || 8)}s` }} />;
        }) : <svg viewBox="0 0 72 56" width={W} height={H}>
          <path className="tail" d="M14 36C2 35 1 20 9 16" fill="none" stroke="#fb923c" strokeWidth="6" strokeLinecap="round" />
          <rect className="leg lb2" x="17" y="38" width="7" height="14" rx="3.5" fill="#f59e42" />
          <rect className="leg lf2" x="41" y="38" width="7" height="14" rx="3.5" fill="#f59e42" />
          <g className="body">
            <ellipse cx="34" cy="34" rx="22" ry="13" fill="#fdba74" />
            <path d="M24 22q2 5 0 9M32 21q2 5 0 10M40 22q2 5 0 9" fill="none" stroke="#fb923c" strokeWidth="2.6" strokeLinecap="round" />
          </g>
          <rect className="leg lb1" x="25" y="38" width="7" height="14" rx="3.5" fill="#fdba74" />
          <rect className="leg lf1" x="49" y="38" width="7" height="14" rx="3.5" fill="#fdba74" />
          <g className="head">
            <path d="M46 18L47 5l9 8zM56 13l8-8 1 13z" fill="#fdba74" />
            <path d="M48 15l.6-6 4.6 4zM58.5 13l4-4 .6 6.5z" fill="#fbcfe8" />
            <circle cx="55" cy="25" r="11.5" fill="#fdba74" />
            <path d="M50 15.5q1 3 0 5M55 14.5v5M60 15.5q-1 3 0 5" fill="none" stroke="#fb923c" strokeWidth="2.2" strokeLinecap="round" />
            <g className="eyes"><circle cx="51" cy="25" r="2" fill="#4c1d95" /><circle cx="59" cy="25" r="2" fill="#4c1d95" /></g>
            <path className="shut" d="M49 25q2 2 4 0M57 25q2 2 4 0" fill="none" stroke="#4c1d95" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M54 29h2l-1 1.4z" fill="#f472b6" />
            <path d="M47 29l-6-1M47 31l-6 1.5M63 29l6-1M63 31l6 1.5" stroke="#92400e" strokeOpacity=".5" strokeWidth=".9" strokeLinecap="round" />
          </g>
        </svg>}
        {!SPRITES && <><i className="zz">z</i><i className="zz z2">z</i></>}
      </div></div>
    </div>
  );
}
