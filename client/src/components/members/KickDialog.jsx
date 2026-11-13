import { useEffect, useRef, useState } from "react";
export default function KickDialog({ member, onResolve }) {
  const ref = useRef(null);
  const [reason, setReason] = useState(""),
    [choice, setChoice] = useState("");
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog.open) dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  }, []);
  const cancel = () => onResolve?.({ choice: "cancel", reason: "" });
  return (
    <dialog ref={ref} className="mg-dialog mg-kick-dialog" aria-labelledby="mg-kick-title" onCancel={(e) => { e.preventDefault(); cancel(); }} onClick={(e) => e.target === ref.current && cancel()}>
      <div className="mg-dlg-body">
        <header><h2 id="mg-kick-title">Loại {member?.ho_ten || "thành viên"}</h2></header>
        <p>Chọn một cách xử lý. Không có lựa chọn mặc định.</p>
        <label className="mg-kick-reason">
          Lý do <strong>(bắt buộc, ít nhất 10 ký tự)</strong>
          <textarea required minLength={10} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        <div className="mg-kick-options">
          {[
            ["cancel", "Hủy bỏ", "mg-kick-cancel"],
            ["reset", "Vẫn loại bỏ", "mg-kick-reset"],
            ["keep", "Chỉ kick", "mg-kick-keep"],
          ].map(([v, label, tone]) => (
            <button key={v} type="button" className={`mg-kick-option ${tone}`} aria-pressed={choice === v} onClick={() => setChoice(v)}>{label}</button>
          ))}
        </div>
        <button className={choice === "reset" ? "danger" : "primary"} disabled={!choice || (choice !== "cancel" && reason.trim().length < 10)} onClick={() => onResolve?.({ choice, reason })}>Xác nhận</button>
      </div>
    </dialog>
  );
}
