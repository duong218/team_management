import { useEffect, useRef } from "react";
import { Pencil, X, Save, Vote } from "lucide-react";
import JoinCodeBox from "./JoinCodeBox";

// <dialog> gốc: tự khóa nền, bẫy phím Tab, đóng bằng Esc.
export default function ProjectSettingsDialog({ open, onClose, project = {}, busy, error, code, onGetCode, onRotate, onDisable, onSave, onVoting }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  const archived = project.trang_thai === "luu_tru";
  return (
    <dialog ref={ref} className="mg-dialog" aria-labelledby="mg-dlg-title" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}>
      {open && (
        <div className="mg-dlg-body">
          <header>
            <span className="mg-ico mg-ico-violet"><Pencil size={18} aria-hidden="true" /></span>
            <h2 id="mg-dlg-title">Chỉnh sửa công việc</h2>
            <button type="button" className="icon-btn" aria-label="Đóng" onClick={onClose}><X size={18} aria-hidden="true" /></button>
          </header>
          {error && <p className="error" role="alert">{error}</p>}
          {archived && <p className="mg-muted">Công việc đã lưu trữ nên không sửa được.</p>}
          <form className="mg-form" onSubmit={(e) => { e.preventDefault(); const v = new FormData(e.currentTarget); onSave(v.get("name"), Number(v.get("maxMembers"))); }}>
            <label>Tên công việc<input name="name" required minLength={2} maxLength={100} defaultValue={project.ten || ""} disabled={archived} /></label>
            <label>Số thành viên tối đa<input name="maxMembers" type="number" required min="1" max="100" defaultValue={project.max_members || 1} disabled={archived} /></label>
            <button className="primary" disabled={busy || archived}><Save size={16} aria-hidden="true" />Lưu thay đổi</button>
          </form>
          <JoinCodeBox code={code} onGet={onGetCode} onRotate={onRotate} onDisable={onDisable} />
          <div className="mg-row">
            <span className="mg-ico mg-ico-amber"><Vote size={18} aria-hidden="true" /></span>
            <div><strong>Bật bình chọn nhận task</strong><p className="mg-muted">{project.bat_binh_chon ? "Đang bật" : "Đang tắt"}</p></div>
            <button type="button" role="switch" aria-checked={!!project.bat_binh_chon} aria-label="Bật bình chọn nhận task" className="mg-switch" disabled={busy || archived} onClick={() => onVoting(!project.bat_binh_chon)}><span /></button>
          </div>
        </div>
      )}
    </dialog>
  );
}
