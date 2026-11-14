import { Crown, ShieldCheck, User, UserMinus, UserPlus, TriangleAlert, X } from "lucide-react";
import { Avatar } from "../common";
import { ROLES } from "../../lib/constants";

const ICON = { truong_nhom: Crown, pho_nhom: ShieldCheck, thanh_vien: User };
// Hai quyền có thể gán: phó nhóm / thành viên. Chuyển quyền trưởng nhóm không còn ở đây.
const ASSIGNABLE = ["pho_nhom", "thanh_vien"];

export default function MemberRow({ member: m, myRole, busy, protectedKick, onRole, onKick, onRejoin, onRemove, readOnly = false }) {
  const Icon = ICON[m.vai_tro] || User;
  const left = m.trang_thai === "da_roi";
  // Khớp luật server: trưởng nhóm không đổi được; phó nhóm không đổi được phó nhóm khác.
  const lockRole = busy || m.vai_tro === "truong_nhom" || (myRole === "pho_nhom" && m.vai_tro === "pho_nhom");
  const lockKick = busy || protectedKick || (myRole === "pho_nhom" && m.vai_tro === "pho_nhom");
  return (
    <article className={`mg-member mg-${m.vai_tro}${left ? " mg-left" : ""}`}>
      <Avatar name={m.ho_ten} src={m.anh_dai_dien} />
      <div className="mg-info">
        <div className="mg-name">
          <strong>{m.ho_ten}</strong>
          <span className={`mg-role mg-role-${m.vai_tro}`}><Icon size={14} aria-hidden="true" />{ROLES[m.vai_tro] || m.vai_tro}</span>
          {m.chua_nhan_viec && <span className="mg-flag"><TriangleAlert size={14} aria-hidden="true" />Chưa nhận việc</span>}
          {left && <span className="mg-flag mg-flag-muted">Đã rời nhóm</span>}
        </div>
        <p>{m.don_vi || "Chưa có đơn vị"}{!readOnly && <> · <b>{m.task_dang_lam}</b> task đang làm
          {m.so_lan_bi_loai > 0 && <> · Từng bị loại {m.so_lan_bi_loai} lần{m.so_lan_bi_loai >= 3 ? " (đã bị cấm)" : ""}</>}</>}</p>
      </div>
      {!readOnly && <div className="mg-actions">
        {left ? (
          <>
            <button type="button" className="primary" disabled={busy} onClick={onRejoin}><UserPlus size={16} aria-hidden="true" />Mời lại</button>
            <button className="danger mg-remove-member" type="button" title="Xóa khỏi danh sách" aria-label={`Xóa ${m.ho_ten} khỏi danh sách`} disabled={busy} onClick={onRemove}><X size={18} aria-hidden="true" /></button>
          </>
        ) : (
          <>
            <div className="mg-seg" role="group" aria-label={`Vai trò của ${m.ho_ten}`}>
              {ASSIGNABLE.map((r) => {
                const I = ICON[r];
                return (
                  <button key={r} type="button" aria-pressed={m.vai_tro === r} className={`mg-seg-${r}`}
                    disabled={lockRole || m.vai_tro === r} onClick={() => onRole(r)}>
                    <I size={16} aria-hidden="true" />{r === "pho_nhom" ? "Phó nhóm" : "Thành viên"}
                  </button>
                );
              })}
            </div>
            <button type="button" className="danger mg-kick" disabled={lockKick} onClick={(event) => { event.preventDefault(); event.stopPropagation(); onKick?.(); }} title="Loại khỏi nhóm"><UserMinus size={16} aria-hidden="true" /><span className="mg-lbl">Loại khỏi nhóm</span></button>
          </>
        )}
      </div>}
    </article>
  );
}
