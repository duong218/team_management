import { useState } from "react";
import { Check, Link2, Pencil, Trash2, X } from "lucide-react";
export default function ChecklistRow({ item, hasOwnLink, canToggle = true, canAddLink, onToggle, onAddLink, readOnly = false, canManage = false, canDelete = true, canReviewProposal = false, canApproveProposal = false, onApproveProposal, onRejectProposal, busy = false, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false), [confirmDelete, setConfirmDelete] = useState(false), [rejecting, setRejecting] = useState(false), [reason, setReason] = useState(''), [value, setValue] = useState(item.noi_dung);
  async function save(e) {
    e.preventDefault();
    if (value.trim() && await onEdit?.(value.trim()) !== false) setEditing(false);
  }
  return (
    <>
      <div className={`check-row ${item.da_xong ? "done" : ""}`}>
        <input type="checkbox" checked={!!item.da_xong} disabled={readOnly || !canToggle || (!item.da_xong && !hasOwnLink)} onChange={onToggle} />
        {editing ? <form className="check-edit" onSubmit={save}><input autoFocus required maxLength={500} value={value} onChange={(e) => setValue(e.target.value)} /><button className="sm primary" disabled={busy || !value.trim()} aria-label="Lưu chỉnh sửa"><Check size={15} /></button><button className="sm" type="button" disabled={busy} onClick={() => { setValue(item.noi_dung); setEditing(false); }} aria-label="Hủy chỉnh sửa"><X size={15} /></button></form> : <span>{item.noi_dung}</span>}
        {item.trang_thai_muc === "cho_duyet" && <em className="chip warn">Đề xuất chờ duyệt</em>}
        {item.trang_thai_muc === "tu_choi" && <em className="chip danger">Đề xuất bị từ chối</em>}
        {canReviewProposal && item.trang_thai_muc === "cho_duyet" && <div className="check-actions"><button className="sm primary" disabled={busy || !canApproveProposal} title={!canApproveProposal ? 'Task đã khóa; chỉ có thể từ chối đề xuất' : 'Duyệt đề xuất'} onClick={onApproveProposal}>Duyệt</button><button className="sm danger" disabled={busy} onClick={() => setRejecting((open) => !open)}>Từ chối</button></div>}
        {canAddLink && !hasOwnLink && <button className="sm" onClick={onAddLink}><Link2 size={14} />Gắn minh chứng</button>}
        {canManage && !editing && <div className="check-actions"><button className="sm" disabled={busy} onClick={() => { setValue(item.noi_dung); setEditing(true); }} aria-label="Chỉnh sửa checklist" title="Chỉnh sửa"><Pencil size={14} /></button><button className="sm danger" disabled={busy || !canDelete} onClick={() => setConfirmDelete(true)} aria-label="Xóa checklist" title={canDelete ? "Xóa mục" : "Không thể xóa mục đã hoàn thành, có minh chứng hoặc là mục cuối cùng"}><Trash2 size={14} /></button></div>}
      </div>
      {confirmDelete && <div className="check-delete" role="group" aria-label="Xác nhận xóa mục checklist"><span>Xóa mục “{item.noi_dung}” khỏi checklist?</span><button className="sm danger" disabled={busy} onClick={async () => { if (await onDelete?.() !== false) setConfirmDelete(false); }}>Xóa mục</button><button className="sm" disabled={busy} onClick={() => setConfirmDelete(false)}>Hủy</button></div>}
      {rejecting && <form className="check-delete" onSubmit={async (event) => { event.preventDefault(); if (await onRejectProposal?.(reason) !== false) { setReason(''); setRejecting(false); } }}><label>Lý do từ chối (bắt buộc, ít nhất 10 ký tự)<textarea minLength={10} maxLength={1000} required value={reason} onChange={(event) => setReason(event.target.value)} /></label><button className="sm danger" disabled={busy || reason.trim().length < 10}>Xác nhận từ chối</button><button className="sm" type="button" disabled={busy} onClick={() => { setReason(''); setRejecting(false); }}>Hủy</button></form>}
    </>
  );
}
