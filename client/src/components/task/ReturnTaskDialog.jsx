import { useEffect, useRef, useState } from "react";
import { RotateCcw, X } from "lucide-react";

export default function ReturnTaskDialog({ task, onCancel, onConfirm }) {
  const dialog = useRef(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (task) {
      setReason("");
      setError("");
      if (!dialog.current?.open) dialog.current?.showModal();
    } else if (dialog.current?.open) dialog.current.close();
  }, [task]);

  async function submit(event) {
    event.preventDefault();
    if (reason.trim().length < 10 || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await onConfirm(reason.trim());
      if (result !== true) setError(typeof result === "string" ? result : "Không thể trả lại task. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }

  return <dialog ref={dialog} className="kb-return-dialog" aria-labelledby="kb-return-title" onCancel={(event) => { if (busy) event.preventDefault(); else onCancel(); }} onClick={(event) => event.target === dialog.current && !busy && onCancel()}>
    {task && <form onSubmit={submit}>
      <header><span><RotateCcw size={18} /></span><h2 id="kb-return-title">Trả task về Đang làm</h2><button type="button" aria-label="Đóng cửa sổ" disabled={busy} onClick={onCancel}><X size={18} /></button></header>
      <p>Task <strong>{task.tieu_de || "không tên"}</strong> sẽ được chuyển về <strong>Đang làm</strong>.</p>
      <label>Lý do trả lại <em>(bắt buộc, ít nhất 10 ký tự)</em><textarea autoFocus maxLength={1000} minLength={10} required value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Nêu rõ nội dung cần chỉnh sửa…" /></label>
      <small className="kb-return-count">{reason.trim().length}/1000</small>
      {error && <p className="kb-return-error" role="alert">{error}</p>}
      <footer><button type="button" className="kb-return-cancel" disabled={busy} onClick={onCancel}>Hủy bỏ</button><button type="submit" className="kb-return-submit" disabled={busy || reason.trim().length < 10}>{busy ? "Đang trả task…" : "Trả lại task"}</button></footer>
    </form>}
  </dialog>;
}
