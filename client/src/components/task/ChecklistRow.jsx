import { useState } from "react";
import { Check, Link2, Pencil, Trash2, X } from "lucide-react";
export default function ChecklistRow({ item, hasOwnLink, canToggle = true, canAddLink, onToggle, onAddLink, readOnly = false, canManage = false, canDelete = true, busy = false, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false), [confirmDelete, setConfirmDelete] = useState(false), [value, setValue] = useState(item.noi_dung);
  async function save(e) {
    e.preventDefault();
    if (value.trim() && await onEdit?.(value.trim()) !== false) setEditing(false);
  }
  return (
    <>
      <div className={`check-row ${item.da_xong ? "done" : ""}`}>
        <input type="checkbox" checked={!!item.da_xong} disabled={readOnly || !canToggle || (!item.da_xong && !hasOwnLink)} onChange={onToggle} />
        {editing ? <form className="check-edit" onSubmit={save}><input autoFocus required maxLength={500} value={value} onChange={(e) => setValue(e.target.value)} /><button className="sm primary" disabled={busy || !value.trim()} aria-label="Lưu chỉnh sửa"><Check size={15} /></button><button className="sm" type="button" disabled={busy} onClick={() => { setValue(item.noi_dung); setEditing(false); }} aria-label="Hủy chỉnh sửa"><X size={15} /></button></form> : <span>{item.noi_dung}</span>}
        {item.trang_thai_muc && item.trang_thai_muc !== "da_duyet" && <em className="chip warn">Chờ duyệt mục</em>}
        {canAddLink && !hasOwnLink && <button className="sm" onClick={onAddLink}><Link2 size={14} />Gắn minh chứng</button>}
        {canManage && !editing && <div className="check-actions"><button className="sm" disabled={busy} onClick={() => { setValue(item.noi_dung); setEditing(true); }} aria-label="Chỉnh sửa checklist" title="Chỉnh sửa"><Pencil size={14} /></button><button className="sm danger" disabled={busy || !canDelete} onClick={() => setConfirmDelete(true)} aria-label="Xóa checklist" title={canDelete ? "Xóa mục" : "Không thể xóa mục đã hoàn thành, có minh chứng hoặc là mục cuối cùng"}><Trash2 size={14} /></button></div>}
      </div>
      {confirmDelete && <div className="check-delete" role="group" aria-label="Xác nhận xóa mục checklist"><span>Xóa mục “{item.noi_dung}” khỏi checklist?</span><button className="sm danger" disabled={busy} onClick={async () => { if (await onDelete?.() !== false) setConfirmDelete(false); }}>Xóa mục</button><button className="sm" disabled={busy} onClick={() => setConfirmDelete(false)}>Hủy</button></div>}
    </>
  );
}
