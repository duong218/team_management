import { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";

export default function RemoveMemberDialog({ open, member, busy, onCancel, onConfirm }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog ref={ref} className="mg-dialog" aria-labelledby="mg-remove-title" onClose={onCancel} onClick={(e) => e.target === ref.current && onCancel()}>
      {open && <div className="mg-dlg-body">
        <header><span className="mg-ico mg-ico-rose"><AlertTriangle size={18} aria-hidden="true" /></span><h2 id="mg-remove-title">Xóa khỏi danh sách?</h2></header>
        <p><strong>{member?.ho_ten}</strong> sẽ bị ẩn khỏi danh sách và không thể mời lại. Lịch sử task vẫn được giữ.</p>
        <div className="mg-remove-dialog-actions">
          <button type="button" disabled={busy} onClick={onCancel}><X size={16} aria-hidden="true" />Hủy</button>
          <button type="button" className="danger" disabled={busy} onClick={onConfirm}>Xóa khỏi danh sách</button>
        </div>
      </div>}
    </dialog>
  );
}
