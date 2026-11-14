import { useCallback, useRef, useState } from "react";
export default function KickDialog({ member, onResolve }) {
  const ref = useRef(null);
  const [reason, setReason] = useState(""),
    [choice, setChoice] = useState("");
  const attachDialog = useCallback((dialog) => {
    ref.current = dialog;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  const okReason = reason.trim().length >= 10,
    name = member?.ho_ten || "người này",
    n = member?.task_dang_lam || 0,
    tasks = n > 0 ? `Người này hiện đang làm ${n} task. ` : "";
  const cancel = () => onResolve?.({ choice: "cancel", reason: "" });
  return (
    <dialog ref={attachDialog} className="mg-dialog mg-kick-dialog" aria-labelledby="mg-kick-title" onCancel={(e) => { e.preventDefault(); cancel(); }} onClick={(e) => e.target === ref.current && cancel()}>
      <div className="mg-dlg-body">
        <header><h2 id="mg-kick-title">Loại {member?.ho_ten || "thành viên"}</h2></header>
        {!choice ? (
          <>
            <p>Chọn một cách xử lý.</p>
            <label className="mg-kick-reason">
              Lý do <strong>(bắt buộc, ít nhất 10 ký tự)</strong>
              <textarea required minLength={10} value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
            <div className="mg-kick-options">
              <button type="button" className="mg-kick-option mg-kick-cancel" onClick={cancel}>Hủy bỏ</button>
              <button type="button" className="mg-kick-option mg-kick-reset" disabled={!okReason} onClick={() => setChoice("reset")}>Vẫn loại bỏ</button>
              <button type="button" className="mg-kick-option mg-kick-keep" disabled={!okReason} onClick={() => setChoice("keep")}>Chỉ kick</button>
            </div>
          </>
        ) : (
          <>
            <p role="alert">
              {choice === "reset"
                ? <>Bạn chắc chắn muốn loại bỏ <strong>{name}</strong>? {tasks}Toàn bộ tiến độ họ đã làm sẽ bị xóa.</>
                : <>Bạn muốn cho <strong>{name}</strong> rời khỏi nhóm? {tasks}Tiến trình của họ vẫn được giữ nguyên và task sẽ được chuyển cho người khác.</>}
            </p>
            <div className="mg-remove-dialog-actions">
              <button type="button" onClick={() => setChoice("")}>Hủy bỏ</button>
              <button type="button" className={choice === "reset" ? "danger" : "primary"} onClick={() => onResolve?.({ choice, reason })}>Xác nhận</button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
