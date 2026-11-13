import { Link2 } from "lucide-react";
export default function ChecklistRow({ item, hasOwnLink, canAddLink, onToggle, onAddLink, readOnly = false }) {
  return (
    <div className={`check-row ${item.da_xong ? "done" : ""}`}>
      <input type="checkbox" checked={!!item.da_xong} disabled={readOnly || !hasOwnLink} onChange={onToggle} />
      <span>{item.noi_dung}</span>
      {item.trang_thai_muc && item.trang_thai_muc !== "da_duyet" && <em className="chip warn">Chờ duyệt mục</em>}
      {canAddLink && !hasOwnLink && (
        <button className="sm" onClick={onAddLink}><Link2 size={14} />Gắn minh chứng</button>
      )}
    </div>
  );
}
