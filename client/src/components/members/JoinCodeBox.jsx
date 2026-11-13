import { Eye, RefreshCw, PowerOff, KeyRound } from "lucide-react";

export default function JoinCodeBox({ code, onGet, onRotate, onDisable }) {
  return (
    <section className="mg-code">
      <h3><span className="mg-ico mg-ico-sky"><KeyRound size={18} aria-hidden="true" /></span>Mã tham gia</h3>
      {code ? <code className="mg-code-val">{code}</code> : <p className="mg-muted">Mã đang tắt hoặc chưa tải.</p>}
      <div className="mg-btns">
        <button className="primary" type="button" onClick={onGet}><Eye size={16} aria-hidden="true" />Xem mã</button>
        <button type="button" onClick={onRotate}><RefreshCw size={16} aria-hidden="true" />Đổi mã</button>
        <button className="danger" type="button" onClick={onDisable}><PowerOff size={16} aria-hidden="true" />Tắt mã</button>
      </div>
    </section>
  );
}
