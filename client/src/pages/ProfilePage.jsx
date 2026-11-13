import { useState } from "react";
import { saveProfile } from "../api/profile";
import { UserRound, IdCard, Building2, LogOut, Sparkles } from "lucide-react";
import { ErrorBox } from "../components/common";
import "@fontsource-variable/nunito/wght.css";
import "../styles/profile.css";
const initials = (n) => n.trim().split(/\s+/).slice(-2).map((w) => w[0]).join("").toUpperCase() || "?";
const FIELDS = [
  ["sky", UserRound, "Họ tên", 100, "name", "Nhập họ và tên"],
  ["sun", IdCard, "Mã định danh", 30, "code", "Mã sinh viên hoặc mã nhân viên"],
  ["mint", Building2, "Lớp / đơn vị", 100, "unit", "Ví dụ: K67 hoặc Ban Kỹ thuật"],
];
export default function ProfilePage({ user, onSaved, logout }) {
  const [name, setName] = useState(user.user_metadata?.full_name || ""),
    [code, setCode] = useState(""),
    [unit, setUnit] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [imgOk, setImgOk] = useState(true),
    photo = user.user_metadata?.avatar_url || user.user_metadata?.picture;
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
  const val = { name, code, unit }, set = { name: setName, code: setCode, unit: setUnit };
  return (
    <div className="pf">
      <span className="pf-blob pf-b1" aria-hidden="true" />
      <span className="pf-blob pf-b2" aria-hidden="true" />
      <main className="pf-panel">
        <aside className="pf-side" aria-hidden="true">
          <Sparkles className="pf-spark" size={22} />
          <div className="pf-avatar">
            {photo && imgOk ? <img src={photo} alt="" referrerPolicy="no-referrer" onError={() => setImgOk(false)} /> : initials(name)}
          </div>
          <b className="pf-name">{name.trim() || "Tên của bạn"}</b>
          <span className="pf-chip sun"><IdCard size={14} />{code.trim() || "Mã định danh"}</span>
          <span className="pf-chip mint"><Building2 size={14} />{unit.trim() || "Lớp / đơn vị"}</span>
          <small>Đây là thẻ nhóm sẽ thấy</small>
        </aside>
        <div className="pf-main">
          <h1>Hoàn thiện hồ sơ</h1>
          <p>Thông tin này giúp nhóm nhận ra bạn.</p>
          <form onSubmit={submit}>
            {FIELDS.map(([tone, Icon, label, max, key, ph]) => (
              <label key={key}>
                {label}
                <span className="pf-field">
                  <span className={`pf-ico ${tone}`}><Icon size={18} /></span>
                  <input required maxLength={max} placeholder={ph} value={val[key]} onChange={(e) => set[key](e.target.value)} />
                </span>
              </label>
            ))}
            {error && <ErrorBox message={error} />}
            <button className="pf-save" disabled={busy}>{busy ? "Đang lưu…" : "Lưu hồ sơ"}</button>
            <button type="button" className="pf-out" onClick={logout}><LogOut size={16} />Đăng xuất</button>
          </form>
        </div>
      </main>
    </div>
  );
}
