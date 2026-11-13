import { useState } from "react";
import { LayoutGrid, Bell, BarChart3, ShieldCheck, Circle, Loader, CircleCheck } from "lucide-react";
import { useAuth } from "../hooks";
import Logo from "../components/common/Logo";
import { ErrorBox } from "../components/common";
import "@fontsource-variable/nunito/wght.css";
import "../styles/login.css";

const FEATURES = [
  [LayoutGrid, "sky", "Bảng Kanban: ai làm gì, nhìn là biết"],
  [Bell, "sun", "Thông báo ngay khi có thay đổi"],
  [BarChart3, "mint", "Báo cáo tiến độ cả nhóm trong một trang"],
];
// [loại màu, biểu tượng, chữ chip, tên việc, % tiến độ] — chỉ để minh hoạ
const DEMO = [
  ["sky", Circle, "Cần làm", "Soạn đề cương", 0],
  ["sun", Loader, "Đang làm", "Thiết kế giao diện", 60],
  ["mint", CircleCheck, "Hoàn thành", "Khảo sát nhu cầu", 100],
];

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
  return (
    <div className="lg">
      <span className="lg-blob lg-b1" aria-hidden="true" />
      <span className="lg-blob lg-b2" aria-hidden="true" />
      <span className="lg-blob lg-b3" aria-hidden="true" />

      <section className="lg-hero" aria-hidden="true">
        <h2>Gom việc cần làm, cả nhóm cùng về đích.</h2>
        <ul>
          {FEATURES.map(([Icon, tone, text]) => (
            <li key={text}>
              <span className={`lg-ico ${tone}`}>
                <Icon size={20} strokeWidth={2} />
              </span>
              {text}
            </li>
          ))}
        </ul>
        <div className="lg-stack">
          {DEMO.map(([tone, Icon, chip, title, p]) => (
            <div className="lg-card" key={title}>
              <div className="lg-card-top">
                <b>{title}</b>
                <span className={`lg-chip ${tone}`}>
                  <Icon size={14} strokeWidth={2.2} />
                  {chip}
                </span>
              </div>
              <div className="lg-bar-row">
                <span className="lg-bar">
                  <i style={{ "--p": `${p}%` }} />
                </span>
                <span className="lg-pct">{p}%</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <main className="lg-side">
        <div className="lg-panel">
          <Logo className="lg-mark" size={64} />
          <h1>Chào mừng đến với Ocean!</h1>
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
        </div>
      </main>
    </div>
  );
}