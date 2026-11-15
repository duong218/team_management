import { useEffect, useState } from "react";
import { LayoutGrid, Bell, BarChart3, ShieldCheck, Circle, Loader, CircleCheck, Sparkles, LogIn, UsersRound, Rocket, Zap } from "lucide-react";
import { useAuth } from "../hooks";
import Logo from "../components/common/Logo";
import { ErrorBox } from "../components/common";
import "@fontsource-variable/nunito/wght.css";
import "../styles/login.css";

const FEATURES = [
  [LayoutGrid, "sky", "Bảng Kanban", "Ai làm gì, nhìn là biết"],
  [Bell, "sun", "Thông báo tức thì", "Có thay đổi là báo ngay"],
  [BarChart3, "mint", "Báo cáo tiến độ", "Cả nhóm gói trong một trang"],
];
// Bảng minh hoạ (không phải dữ liệu thật): [loại màu, biểu tượng, tên cột, [[việc, %, người]]]
const BOARD = [
  ["sky", Circle, "Cần làm", [["Soạn đề cương", 0, "pink"], ["Chọn đề tài", 0, "sun"]]],
  ["sun", Loader, "Đang làm", [["Thiết kế giao diện", 60, "violet"]]],
  ["mint", CircleCheck, "Hoàn thành", [["Khảo sát nhu cầu", 100, "sky"]]],
];
const STEPS = [
  [LogIn, "Đăng nhập"],
  [UsersRound, "Vào nhóm"],
  [Rocket, "Nhận việc"],
];
const initial = { pink: "D", sun: "M", violet: "A", sky: "L" };

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
        <span className="lg-blob lg-b1" />
        <span className="lg-blob lg-b2" />
        <span className="lg-blob lg-b3" />
        <span className="lg-wave lg-w1" />
        <span className="lg-wave lg-w2" />
        <span className="lg-wave lg-w3" />
      </div>

      <header className="lg-brand">
        <Logo className="lg-logo" size={36} />
        <b>Ocean and Gem</b>
        <span className="lg-pill"><Sparkles size={14} aria-hidden="true" />Theo dõi tiến độ nhóm</span>
      </header>

      <section className="lg-hero" aria-hidden="true">
        <h2>Gom việc cần làm, cả nhóm <em>cùng về đích.</em></h2>
        <p className="lg-lead">Chia việc rõ ràng, cập nhật tiến độ theo thời gian thực, không còn hỏi nhau “xong chưa?”.</p>

        <ul className="lg-feats">
          {FEATURES.map(([Icon, tone, title, text]) => (
            <li key={title} className={tone}>
              <span className={`lg-ico ${tone}`}><Icon size={20} strokeWidth={2} /></span>
              <b>{title}</b>
              <span>{text}</span>
            </li>
          ))}
        </ul>

        <div className="lg-board">
          {BOARD.map(([tone, Icon, name, cards]) => (
            <div className={`lg-col ${tone}`} key={name}>
              <div className={`lg-chip ${tone}`}><Icon size={14} strokeWidth={2.2} />{name}</div>
              {cards.map(([title, p, who]) => (
                <div className="lg-card" key={title}>
                  <b>{title}</b>
                  <div className="lg-bar-row">
                    <span className="lg-bar"><i className={tone} style={{ "--p": `${p}%` }} /></span>
                    <span className="lg-pct">{p}%</span>
                  </div>
                  <span className={`lg-av ${who}`}>{initial[who]}</span>
                </div>
              ))}
            </div>
          ))}
          <span className="lg-float lg-f1"><Zap size={14} aria-hidden="true" />Vừa cập nhật 60%</span>
          <span className="lg-float lg-f2"><CircleCheck size={14} aria-hidden="true" />Được duyệt</span>
        </div>
      </section>

      <main className="lg-side">
        <div className="lg-panel">
          <Logo className="lg-mark" size={56} />
          <h1>Chào mừng đến với <span>Ocean and Gem!</span></h1>
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
          <p className="lg-note">
            <ShieldCheck size={16} aria-hidden="true" />
            Dùng tài khoản Google, không cần nhớ mật khẩu.
          </p>
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