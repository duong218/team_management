import { Check, Repeat, X, DoorOpen } from "lucide-react";
import { Avatar } from "../common";

export default function WaitingRoom({ requests = [], onApprove, onReplace, onReject }) {
  return (
    <section className="card mg-card">
      <h2><span className="mg-ico mg-ico-amber"><DoorOpen size={18} aria-hidden="true" /></span>Phòng chờ <span className="mg-count">{requests.length}</span></h2>
      {!requests.length && <p className="mg-muted">Chưa có ai xin vào nhóm.</p>}
      {requests.map((r) => (
        <article key={r.id || r.request_id} className="mg-member mg-wait">
          <Avatar name={r.ho_ten} src={r.anh_dai_dien} />
          <div className="mg-info">
            <div className="mg-name"><strong>{r.ho_ten}</strong></div>
            <p>{r.email} · {r.don_vi} · {r.ma_dinh_danh}</p>
          </div>
          <div className="mg-actions">
            <button className="primary" onClick={() => onApprove?.(r)}><Check size={16} aria-hidden="true" />Cho vào</button>
            <button onClick={() => onReplace?.(r)}><Repeat size={16} aria-hidden="true" />Thay thế người cũ</button>
            <button className="danger" onClick={() => onReject?.(r)}><X size={16} aria-hidden="true" />Từ chối</button>
          </div>
        </article>
      ))}
    </section>
  );
}
