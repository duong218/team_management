import { useState } from "react";
import { Check } from "lucide-react";
import { useAuth } from "../hooks";
import { ErrorBox } from "../components/common";
import "../styles/login.css";

const FEATURES = [
  "Bảng Kanban kéo thả, ai làm gì nhìn là biết",
  "Thông báo ngay khi có thay đổi",
  "Báo cáo tiến độ cả nhóm trong một trang",
];
// [tên cột, [[tên việc, % tiến độ]]] — chỉ để minh hoạ
const DEMO = [
  ["Cần làm", [["Soạn đề cương", 0]]],
  ["Đang làm", [["Thiết kế giao diện", 60]]],
  ["Xong", [["Khảo sát nhu cầu", 100]]],
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
      <section className="lg-hero" aria-hidden="true">
        <h2>Gom việc cần làm, cả nhóm cùng về đích.</h2>
        <ul>
          {FEATURES.map((f) => (
            <li key={f}>
              <Check strokeWidth={3} />
              {f}
            </li>
          ))}
        </ul>
        <div className="lg-board">
          {DEMO.map(([name, cards]) => (
            <div className="lg-col" key={name}>
              <b>{name}</b>
              {cards.map(([title, p]) => (
                <div className="lg-card" key={title}>
                  {title}
                  <span className="lg-bar">
                    <i style={{ "--p": `${p}%` }} />
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <main className="lg-side">
        <div className="lg-panel">
          <div className="lg-mark" aria-hidden="true">N</div>
          <h1>Nhóm mình</h1>
          <p>Gom việc cần làm, cùng theo dõi tiến độ.</p>
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
            {busy ? <span className="lg-spin" aria-hidden="true" /> : <GoogleG />}
            {busy ? "Đang chuyển tới Google…" : "Đăng nhập bằng Google"}
          </button>
          <p className="lg-note">Dùng tài khoản Google, không cần nhớ mật khẩu.</p>
        </div>
      </main>
    </div>
  );
}
