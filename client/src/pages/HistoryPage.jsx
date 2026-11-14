import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Archive, ArrowRight, Crown, Trash2, Users } from "lucide-react";
import * as projectApi from "../api/projects";
import { useProjects } from "../hooks";
import { EmptyState, ErrorBox, Skeleton } from "../components/common";
import "../styles/history.css";

export default function HistoryPage({ userId, navigate }) {
  const projects = useProjects(userId);
  const [deleting, setDeleting] = useState(null), [busy, setBusy] = useState(false), [deleteError, setDeleteError] = useState("");
  const dialog = useRef(null);
  useEffect(() => {
    if (deleting && !dialog.current.open) dialog.current.showModal();
    if (!deleting && dialog.current?.open) dialog.current.close();
  }, [deleting]);
  if (projects.loading) return <Skeleton />;
  if (projects.error) return <ErrorBox message={projects.error} onRetry={projects.reload} />;

  async function confirmDelete() {
    setBusy(true);
    setDeleteError("");
    try {
      await projectApi.deleteArchivedProject(deleting.id);
      setDeleting(null);
      await projects.reload();
    } catch (error) {
      setDeleteError(error.message || "Không thể xóa công việc.");
    } finally {
      setBusy(false);
    }
  }

  const archived = (projects.data || []).filter(
    (project) => project.trang_thai === "luu_tru" && project.vai_tro !== "thanh_vien",
  );

  return (
    <section className="history-page">
      <header className="history-heading">
        <span className="history-icon"><Archive size={22} /></span>
        <div><h1>Lịch sử công việc</h1><p>Các công việc đã kết thúc · Chỉ xem</p></div>
        <span className="history-count">{archived.length}</span>
      </header>
      {!archived.length ? <EmptyState title="Chưa có công việc đã kết thúc">Công việc bạn quản lý sẽ xuất hiện ở đây sau khi kết thúc.</EmptyState> : (
        <div className="history-grid">
          {archived.map((project) => (
            <article className="card history-card" key={project.id}>
              <div className="history-card-top"><span><Archive size={16} />Đã kết thúc</span><span className="history-role">{project.vai_tro === "truong_nhom" ? <Crown size={14} /> : <Users size={14} />}{project.vai_tro === "truong_nhom" ? "Nhóm trưởng" : "Phó nhóm"}</span></div>
              <h2>{project.ten}</h2>
              <p>{project.max_members} thành viên tối đa</p>
              <div className="history-actions">
                <button type="button" className="primary" onClick={() => navigate(`/history/${project.id}`)}>Xem bảng Kanban <ArrowRight size={16} /></button>
                <button type="button" className="history-delete" onClick={() => { setDeleteError(""); setDeleting(project); }}><Trash2 size={16} aria-hidden="true" />Xóa vĩnh viễn</button>
              </div>
            </article>
          ))}
        </div>
      )}
      <dialog ref={dialog} className="history-delete-dialog" aria-labelledby="history-delete-title" onCancel={(event) => { event.preventDefault(); if (!busy) setDeleting(null); }} onClick={(event) => { if (event.target === dialog.current && !busy) setDeleting(null); }}>
        <div className="history-delete-body">
          <span className="history-delete-icon"><AlertTriangle size={22} aria-hidden="true" /></span>
          <h2 id="history-delete-title">Xóa công việc vĩnh viễn?</h2>
          <p>Bạn sắp xóa <strong>{deleting?.ten}</strong> cùng toàn bộ task (kể cả task đã hủy), bình luận và lịch sử liên quan. Dữ liệu sẽ không thể khôi phục.</p>
          {deleteError && <p className="history-delete-error" role="alert">{deleteError}</p>}
          <div className="history-delete-actions">
            <button type="button" disabled={busy} onClick={() => setDeleting(null)}>Hủy bỏ</button>
            <button type="button" className="history-delete-confirm" disabled={busy} onClick={confirmDelete}>{busy ? "Đang xóa…" : "Tiếp tục xóa"}</button>
          </div>
        </div>
      </dialog>
    </section>
  );
}
