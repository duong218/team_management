import { useEffect, useState } from "react";
import { LayoutGrid, Bell, BarChart3, ShieldCheck, Sparkles, LogIn, UsersRound, Rocket, CircleCheck } from "lucide-react";
import { useAuth } from "../hooks";
import Logo from "../components/common/Logo";
import { ErrorBox } from "../components/common";
import "../styles/login.css";

// Mọi hình động vật là sticker trang trí (public/mascots/*.webp), không mang thông tin nên alt rỗng.
const Mascot = ({ name, className = "", delay = 0 }) => (
  <span className={`lg-mc ${className}`} style={{ "--d": `${delay}s` }} aria-hidden="true">
    <img src={`/mascots/${name}.webp`} alt="" decoding="async" draggable="false" />
  </span>
);
const Sparkle = ({ className }) => (
  <svg className={`lg-sp ${className}`} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0c1 6.5 5.5 11 12 12-6.5 1-11 5.5-12 12-1-6.5-5.5-11-12-12 6.5-1 11-5.5 12-12Z" /></svg>
);
const Cloud = ({ className }) => (
  <svg className={`lg-cloud ${className}`} viewBox="0 0 220 110" aria-hidden="true">
    <g fill="#fff"><circle cx="64" cy="70" r="34" /><circle cx="108" cy="50" r="44" /><circle cx="158" cy="72" r="32" /><rect x="64" y="70" width="96" height="34" rx="17" /></g>
  </svg>
);
const MiniGem = ({ className }) => (
  <svg className={`lg-gm ${className}`} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 9 7 3h10l4 6-9 12Z" fill="#8b5cf6" /><path d="M3 9h18L12 21Z" fill="#6d28d9" /><path d="M7 3 9 9h6l2-6Z" fill="#c4b5fd" /><path d="M9 9 12 21 15 9Z" fill="#a78bfa" />
  </svg>
);

// Logo ngọc của thương hiệu + khuôn mặt (cùng viewBox 48 nên khớp từng điểm).
const GemMascot = ({ size }) => (
  <span className="lg-gem" style={{ width: size, height: size }} aria-hidden="true">
    <Logo size={size} />
    <svg viewBox="0 0 48 48" className="lg-face">
      <ellipse cx="16.2" cy="25" rx="2.6" ry="1.5" fill="#ff7aa8" opacity=".8" /><ellipse cx="31.8" cy="25" rx="2.6" ry="1.5" fill="#ff7aa8" opacity=".8" />
      <circle cx="19.4" cy="22" r="1.9" fill="#2e1065" /><circle cx="28.6" cy="22" r="1.9" fill="#2e1065" />
      <circle cx="19.9" cy="21.4" r=".6" fill="#fff" /><circle cx="29.1" cy="21.4" r=".6" fill="#fff" />
      <path d="M21.8 25.6q2.2 2.4 4.4 0" fill="none" stroke="#2e1065" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  </span>
);

const FEATURES = [
  [LayoutGrid, "sky", "Bảng Kanban", "Ai làm gì, nhìn là biết", "cat"],
  [Bell, "sun", "Thông báo tức thì", "Có thay đổi là báo ngay", "rabbit"],
  [BarChart3, "mint", "Báo cáo tiến độ", "Cả nhóm gói trong một trang", "bear"],
];
// Dữ liệu minh hoạ (không phải dữ liệu thật): [việc, %, màu, linh vật]
const RECENT = [
  ["Tổng hợp tài liệu", 30, "pink", "koala"],
  ["Thiết kế giao diện", 60, "orange", "rabbit"],
  ["Khảo sát nhu cầu", 100, "mint", "bear"],
  ["Thuyết trình nhóm", 10, "violet", "fox"],
  ["Lên kế hoạch marketing", 15, "sky", "raccoon"],
];
const STEPS = [[LogIn, "Đăng nhập"], [UsersRound, "Vào nhóm"], [Rocket, "Nhận việc"]];

const GoogleG = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
    <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
  </svg>
);

export default function LoginPage() {
  const { login, error } = useAuth();
  const [busy, setBusy] = useState(false);
  // Bấm "quay lại" từ trang Google: trình duyệt khôi phục trang cũ (bfcache) với busy vẫn đang true → nút kẹt.
  useEffect(() => {
    const reset = () => setBusy(false);
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);
  return (
    <div className="lg">
      <div className="lg-bg" aria-hidden="true">
        <Cloud className="lg-cl1" /><Cloud className="lg-cl2" /><Cloud className="lg-cl3" /><Cloud className="lg-cl4" />
        <Sparkle className="lg-s1" /><Sparkle className="lg-s2" /><Sparkle className="lg-s3" /><Sparkle className="lg-s4" /><Sparkle className="lg-s5" /><Sparkle className="lg-s6" />
        <MiniGem className="lg-g1" /><MiniGem className="lg-g2" /><MiniGem className="lg-g3" />
      </div>

      <header className="lg-brand">
        <Logo className="lg-logo" size={36} />
        <b>Ocean and Gem</b>
        <span className="lg-pill"><Sparkles size={14} aria-hidden="true" />Theo dõi tiến độ nhóm</span>
      </header>

      <section className="lg-hero" aria-hidden="true">
        <h2>
          <span className="c0">Gom</span> <span className="c1">việc</span> <span className="c2">cần làm,</span> <span className="c0">cả</span>{" "}
          <span className="c2">nhóm</span> <span className="c3">cùng</span> <span className="c4">về</span> <span className="c5">đích.</span>
        </h2>

        <ul className="lg-feats">
          {FEATURES.map(([Icon, tone, title, text, pet], i) => (
            <li key={title} className={tone}>
              <span className={`lg-ico ${tone}`}><Icon size={20} strokeWidth={2} /></span>
              <b>{title}</b>
              <span>{text}</span>
              <Mascot name={pet} className="lg-feat-pet" delay={i * 0.6} />
            </li>
          ))}
        </ul>

        <div className="lg-pets" aria-hidden="true">
          {["cat", "rabbit", "bear", "fox", "raccoon"].map((n, i) => <Mascot key={n} name={n} delay={i * 0.45} />)}
        </div>

        <div className="lg-recent">
          <p className="lg-recent-title">Gần đây</p>
          <div className="lg-tasks">
            {RECENT.map(([title, p, tone, pet], i) => (
              <div className={`lg-task ${tone}`} key={title}>
                <b>{title}</b>
                <span className="lg-pct">{p}%</span>
                <span className="lg-bar"><i style={{ "--p": `${p}%` }} /></span>
                <Mascot name={pet} className="lg-task-pet" delay={i * 0.5} />
              </div>
            ))}
          </div>
          <span className="lg-approved"><CircleCheck size={14} aria-hidden="true" />Được duyệt</span>
          <div className="lg-online">
            <span className="lg-avatar"><Mascot name="owl" delay={0.2} /></span>
            <span className="lg-avatar"><Mascot name="squirrel" delay={0.9} /></span>
            <span className="lg-avatar"><Mascot name="turtle" delay={1.5} /></span>
          </div>
        </div>
        <Mascot name="cat" className="lg-cat" delay={0.3} />
      </section>

      <main className="lg-side">
        <div className="lg-panel">
          <GemMascot size={72} />
          <Sparkle className="lg-ps1" /><Sparkle className="lg-ps2" /><Sparkle className="lg-ps3" /><Sparkle className="lg-ps4" />
          <h1>
            <span className="c1">Chào</span> <span className="c2">mừng</span> <span className="c6">đến</span> <span className="c4">với</span>{" "}
            <span className="lg-brandline"><span className="c3">Ocean</span> <span className="c4">and</span> <span className="c6">Gem!</span></span>
          </h1>
          <p>Đăng nhập để xem việc của mình và theo dõi tiến độ cả nhóm.</p>
          {error && <ErrorBox message={error} />}
          <button
            className="lg-btn"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await login();
              } finally {
                setBusy(false);
              }
            }}
          >
            <span className="lg-g">{busy ? <span className="lg-spin" aria-hidden="true" /> : <GoogleG />}</span>
            {busy ? "Đang chuyển tới Google…" : "Đăng nhập bằng Google"}
          </button>
          <p className="lg-note"><ShieldCheck size={16} aria-hidden="true" />Dùng tài khoản Google, không cần nhớ mật khẩu.</p>
          <ol className="lg-steps" aria-label="Cách bắt đầu">
            {STEPS.map(([Icon, text], i) => (
              <li key={text}><span className={`lg-step s${i}`}><Icon size={16} aria-hidden="true" /></span>{text}</li>
            ))}
          </ol>
        </div>
      </main>
    </div>
  );
}
