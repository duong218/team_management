import { useEffect, useRef } from "react";
import { TriangleAlert, Flag } from "lucide-react";

const LABEL = {
  task_chua_xong: (w) => `Task chưa xong: ${w.tieu_de || "(không tiêu đề)"} (${Number(w.tien_do || 0).toFixed(0)}%)`,
  link_bi_tu_choi: () => "Có link minh chứng bị từ chối",
  task_nguoi_roi: (w) => `Task còn gắn với người đã rời nhóm: ${w.ho_ten || "thành viên"}`,
  yeu_cau_chuyen_giao: () => "Có yêu cầu chuyển giao chưa xử lý",
};

// Bước 1 (warnings = null): cảnh báo chung. Bước 2 (warnings = mảng): liệt kê vấn đề còn tồn đọng.
// Nút "Hủy/Quay lại" đứng đầu nên được focus sẵn; không có nút nguy hiểm nào được chọn mặc định.
export default function CloseProjectDialog({ open, warnings, busy, onCancel, onConfirm }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  const step2 = Array.isArray(warnings);
  return (
    <dialog ref={ref} className="mg-dialog" aria-labelledby="mg-close-title" onClose={onCancel} onClick={(e) => e.target === ref.current && onCancel()}>
      {open && (
        <div className="mg-dlg-body">
          <header>
            <span className="mg-ico mg-ico-rose"><TriangleAlert size={18} aria-hidden="true" /></span>
            <h2 id="mg-close-title">{step2 ? `Còn ${warnings.length} vấn đề chưa xử lý` : "Kết thúc công việc?"}</h2>
          </header>
          {step2 ? (
            <ul className="mg-warn-list">{warnings.map((w, i) => <li key={i}>{(LABEL[w.loai] || (() => w.loai))(w)}</li>)}</ul>
          ) : (
            <ul className="mg-warn-list">
              <li>Hệ thống chốt sổ điểm và tiến độ của mọi thành viên.</li>
              <li>Công việc chuyển sang lưu trữ: không thêm, sửa hay giao task được nữa.</li>
              <li>Mã tham gia bị tắt, các yêu cầu vào nhóm đang chờ sẽ hết hạn.</li>
              <li>Chỉ nhóm trưởng mới mở lại được.</li>
            </ul>
          )}
          {step2 && <p className="mg-muted">Nếu vẫn kết thúc, các vấn đề trên được ghi nhận vào bản chốt sổ.</p>}
          <div className="mg-btns">
            <button type="button" onClick={onCancel}>{step2 ? "Quay lại" : "Hủy"}</button>
            <button type="button" className="danger" disabled={busy} onClick={onConfirm}><Flag size={16} aria-hidden="true" />{step2 ? "Vẫn kết thúc" : "Tiếp tục kết thúc"}</button>
          </div>
        </div>
      )}
    </dialog>
  );
}
