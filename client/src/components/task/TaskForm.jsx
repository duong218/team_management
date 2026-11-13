import { useState } from "react";
import { ErrorBox } from "../common";
export default function TaskForm({ members = [], onSubmit }) {
  const [title, setTitle] = useState(""),
    [desc, setDesc] = useState(""), [items, setItems] = useState(""),
    [due, setDue] = useState(""), [assignee, setAssignee] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true); setError("");
        try { await onSubmit?.({ title, desc, due, assignee, checklist: items.split("\n").map((noi_dung) => noi_dung.trim()).filter(Boolean) }); setTitle(""); setDesc(""); setItems(""); setDue(""); setAssignee(""); }
        catch (e) { setError(e.message); }
        finally { setBusy(false); }
      }}
    >
      <label>
        Tiêu đề
        <input
          maxLength={200}
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label>
        Mô tả
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} />
      </label>
      <label>Checklist (mỗi dòng một mục)<textarea required value={items} onChange={(e) => setItems(e.target.value)} /></label>
      <label>Hạn chót<input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} /></label>
      <label>Người chính<select value={assignee} onChange={(e) => setAssignee(e.target.value)}><option value="">Chưa giao</option>{members.map((m) => <option key={m.member_id} value={m.member_id}>{m.ho_ten}</option>)}</select></label>
      {error && <ErrorBox message={error} />}
      <button className="button primary" disabled={busy}>Tạo task</button>
    </form>
  );
}