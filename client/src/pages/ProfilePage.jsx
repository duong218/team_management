import { useState } from "react";
import { saveProfile } from "../api/profile";
import { ErrorBox } from "../components/common";
export default function ProfilePage({ user, onSaved, logout }) {
  const [name, setName] = useState(user.user_metadata?.full_name || ""),
    [code, setCode] = useState(""),
    [unit, setUnit] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await saveProfile(name, code, unit);
      onSaved();
    } catch (x) {
      setError(x.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-card">
      <h1>Hoàn thiện hồ sơ</h1>
      <p>Thông tin này giúp nhóm nhận ra bạn.</p>
      <form onSubmit={submit}>
        <label>
          Họ tên
          <input
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Mã định danh
          <input
            required
            maxLength={30}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
        <label>
          Lớp / đơn vị
          <input
            required
            maxLength={100}
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />
        </label>
        {error && <ErrorBox message={error} />}
        <button className="button primary" disabled={busy}>
          {busy ? "Đang lưu…" : "Lưu hồ sơ"}
        </button>
        <button type="button" className="button" onClick={logout}>
          Đăng xuất
        </button>
      </form>
    </main>
  );
}
