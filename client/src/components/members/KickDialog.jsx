import { useState } from "react";
export default function KickDialog({ member, onResolve }) {
  const [reason, setReason] = useState(""),
    [choice, setChoice] = useState("");
  return (
    <section className="card">
      <h2>Loại {member?.ho_ten || "thành viên"}</h2>
      <p>Chọn một cách xử lý. Không có lựa chọn mặc định.</p>
      <label>
        Lý do (ít nhất 10 ký tự)
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      <div className="project-grid">
        {[
          ["cancel", "Hủy bỏ"],
          ["reset", "Vẫn loại bỏ"],
          ["keep", "Chỉ kick"],
        ].map(([v, label]) => (
          <button
            key={v}
            aria-pressed={choice === v}
            onClick={() => setChoice(v)}
          >
            {label}
          </button>
        ))}
      </div>
      <button
        disabled={!choice || reason.trim().length < 10}
        onClick={() => onResolve?.({ choice, reason })}
      >
        Xác nhận
      </button>
    </section>
  );
}
