import { useEffect, useRef, useState } from "react";
import { Pencil, Undo2, Trash2, EyeOff, X, Check } from "lucide-react";
import Avatar from "../common/Avatar";
import { vnTime } from "../../lib/format";
/* Sửa/gỡ: chỉ người viết. Xóa: chỉ nhóm trưởng/phó. Hàm onEdit/onRetract/onDelete nhận id và ném lỗi nếu thất bại. */
export default function CommentThread({ comments = [], meId, legacy, manager = false, readOnly = false, onEdit, onRetract, onDelete }) {
  const box = useRef(null),
    [editing, setEditing] = useState(null), // { id, text }
    [ask, setAsk] = useState(null), // { id, kind: "retract" | "delete" }
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => { const el = box.current; if (el) el.scrollTop = el.scrollHeight; }, [comments.length]);
  async function run(fn) {
    setBusy(true);
    setError("");
    try { await fn(); setEditing(null); setAsk(null); } catch (x) { setError(x.message || "Không thực hiện được"); } finally { setBusy(false); }
  }
  if (!comments.length && !legacy) return <p className="td-empty">Chưa có bình luận nào. Hãy là người đầu tiên.</p>;
  return (
    <div className="cm-thread" ref={box}>
      {legacy && <p className="cm-legacy"><b>Bình luận cũ (không rõ người gửi)</b>{legacy}</p>}
      {comments.map((c) => {
        const mine = c.user_id === meId, gone = !!c.go_luc, canAct = !readOnly,
          canEdit = canAct && mine && !gone, canRetract = canAct && mine && !gone, canDelete = canAct && manager;
        return (
          <div key={c.id} className={`cm ${mine ? "mine" : ""} ${gone ? "gone" : ""} ${editing?.id === c.id ? "editing" : ""}`}>
            <Avatar name={c.ho_ten || "?"} src={c.anh_dai_dien} />
            <div className="cm-body">
              <div className="cm-who">
                <strong>{c.ho_ten || "Thành viên"}</strong>
                <time>{vnTime(c.tao_luc)}</time>
                {c.sua_luc && !gone && <em className="cm-edited" title={`Sửa lúc ${vnTime(c.sua_luc)}`}>(đã chỉnh sửa)</em>}
              </div>
              {editing?.id === c.id ? (
                <div className="cm-edit">
                  <textarea maxLength={2000} value={editing.text} autoFocus aria-label="Sửa bình luận" onChange={(e) => setEditing({ id: c.id, text: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Escape") setEditing(null); if (e.key === "Enter" && !e.shiftKey && editing.text.trim()) { e.preventDefault(); run(() => onEdit(c.id, editing.text)); } }} />
                  <div className="cm-acts">
                    <button type="button" className="cm-act" onClick={() => setEditing(null)} disabled={busy}>Hủy</button>
                    <button type="button" className="cm-act cm-main" disabled={busy || !editing.text.trim()} onClick={() => run(() => onEdit(c.id, editing.text))}>Lưu</button>
                  </div>
                </div>
              ) : (
                <p className="cm-bubble">{c.noi_dung}</p>
              )}
              {gone && <small className="cm-gone"><EyeOff size={14} aria-hidden="true" />{c.go_ten || c.ho_ten || "Người dùng"} đã gỡ tin nhắn này</small>}
              {editing?.id !== c.id && (canEdit || canRetract || canDelete) && (
                ask?.id === c.id ? (
                  <div className="cm-acts cm-ask">
                    <span>{ask.kind === "delete" ? "Xóa hẳn bình luận này?" : "Gỡ tin nhắn này?"}</span>
                    <button type="button" className="cm-act cm-ico" disabled={busy} aria-label={ask.kind === "delete" ? "Không xóa" : "Không gỡ"} title="Không" onClick={() => setAsk(null)}><X size={20} strokeWidth={2.4} aria-hidden="true" /></button>
                    <button type="button" className="cm-act cm-ico cm-confirm" disabled={busy} aria-label={ask.kind === "delete" ? "Xác nhận xóa hẳn bình luận" : "Xác nhận gỡ tin nhắn"} title={ask.kind === "delete" ? "Xóa" : "Gỡ"} onClick={() => run(() => (ask.kind === "delete" ? onDelete(c.id) : onRetract(c.id)))}><Check size={20} strokeWidth={2.4} aria-hidden="true" /></button>
                  </div>
                ) : (
                  <div className="cm-acts">
                    {canEdit && <button type="button" className="cm-act" onClick={() => { setError(""); setEditing({ id: c.id, text: c.noi_dung }); }}><Pencil size={14} aria-hidden="true" />Sửa</button>}
                    {canRetract && <button type="button" className="cm-act" onClick={() => { setError(""); setAsk({ id: c.id, kind: "retract" }); }}><Undo2 size={14} aria-hidden="true" />Gỡ</button>}
                    {canDelete && <button type="button" className="cm-act cm-danger" onClick={() => { setError(""); setAsk({ id: c.id, kind: "delete" }); }}><Trash2 size={14} aria-hidden="true" />Xóa</button>}
                  </div>
                )
              )}
              {error && (editing?.id === c.id || ask?.id === c.id) && <small className="cm-error" role="alert">{error}</small>}
            </div>
          </div>
        );
      })}
    </div>
  );
}