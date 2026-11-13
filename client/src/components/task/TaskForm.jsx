import { useState } from "react";
import { ErrorBox } from "../common";
const pad = (n) => String(n).padStart(2, "0");
// Hạn nhanh: cuối ngày (23:59) sau `days` ngày, đúng định dạng của ô datetime-local
const endOfDay = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T23:59`;
};
const QUICK = [["Hôm nay", 0], ["Ngày mai", 1], ["+ 7 ngày", 7]];
export default function TaskForm({ members = [], onSubmit, onClose }) {
  const [title, setTitle] = useState(""),
    [desc, setDesc] = useState(""), [items, setItems] = useState(""),
    [due, setDue] = useState(""), [assignee, setAssignee] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false),
    list = items.split("\n").map((s) => s.trim()).filter(Boolean),
    close = (e) => { if (onClose) return onClose(); const d = e?.target?.closest("details"); if (d) d.open = false; };
  return (
    <form
      className="tf"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        setBusy(true); setError("");
        try { await onSubmit?.({ title, desc, due, assignee, checklist: list }); setTitle(""); setDesc(""); setItems(""); setDue(""); setAssignee(""); close({ target: form }); }
        catch (e) { setError(e.message); }
        finally { setBusy(false); }
      }}
    >
      <div className="tf-grid">
        <div className="tf-main">
          <label className="tf-field">
            <span className="tf-label">Tiêu đề <b>*</b><em>{title.length}/200</em></span>
            <input autoFocus maxLength={200} required placeholder="VD: Thiết kế poster sự kiện" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="tf-field">
            <span className="tf-label">Mô tả</span>
            <textarea rows={3} placeholder="Yêu cầu, bối cảnh, tài liệu liên quan…" value={desc} onChange={(e) => setDesc(e.target.value)} />
          </label>
          <label className="tf-field">
            <span className="tf-label">Checklist <b>*</b><em className={list.length > 30 ? "over" : ""}>{list.length}/30 mục</em></span>
            <textarea className="tf-list" required rows={6} placeholder={"Mỗi dòng là một mục, ví dụ:\nLên ý tưởng\nThiết kế bản nháp\nNộp bản cuối"} value={items} onChange={(e) => setItems(e.target.value)} />
          </label>
        </div>
        <aside className="tf-side">
          <label className="tf-field">
            <span className="tf-label">Hạn chót</span>
            <input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
            <span className="tf-quick">
              {QUICK.map(([text, d]) => <button type="button" key={text} onClick={() => setDue(endOfDay(d))}>{text}</button>)}
              {due && <button type="button" className="tf-clear" onClick={() => setDue("")}>Xóa</button>}
            </span>
            <small>Gửi duyệt trước giờ này là đúng hạn, dù nhóm trưởng duyệt muộn.</small>
          </label>
          <label className="tf-field">
            <span className="tf-label">Người chính</span>
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              <option value="">Chưa giao</option>
              {members.map((m) => <option key={m.member_id} value={m.member_id}>{m.ho_ten}</option>)}
            </select>
            <small>Có thể giao sau khi tạo task.</small>
          </label>
        </aside>
      </div>
      {error && <ErrorBox message={error} />}
      <div className="tf-foot">
        <button type="button" onClick={(e) => close(e)}>Hủy</button>
        <button className="primary" disabled={busy || list.length > 30}>{busy ? "Đang tạo…" : "Tạo task"}</button>
      </div>
    </form>
  );
}
