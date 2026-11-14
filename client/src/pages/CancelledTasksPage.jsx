import { useState } from "react";
import { CircleX, RotateCcw, Archive, Clock, FolderKanban, ChevronLeft, ChevronRight } from "lucide-react";
import { useAsync, useProject, useProjects } from "../hooks";
import * as api from "../api/tasks";
import { ErrorBox, Skeleton, EmptyState } from "../components/common";
import { vnTime } from "../lib/format";
import SeasonScene from "../components/task/SeasonScene";
import "../styles/cancelled.css";

const MIN = 10;
const PAGE_SIZE = 10;

export default function CancelledTasksPage({ projectId, userId, readOnly: requestedReadOnly = false, navigate }) {
  const projects = useProjects(userId);
  const project = useProject(projectId);
  const projectIds = requestedReadOnly && projectId ? [projectId] : (projects.data || []).map((p) => p.id);
  const q = useAsync(() => api.listCancelledTasksForProjects(projectIds), [projectIds.join(",")]);
  const [reasons, setReasons] = useState({}), [error, setError] = useState(""), [busyId, setBusyId] = useState(null), [filterId, setFilterId] = useState("");
  const [page, setPage] = useState(1);

  if (q.loading || projects.loading || (projectId && project.loading)) return <Skeleton />;
  if (q.error || projects.error || (projectId && project.error)) return <ErrorBox message={q.error || projects.error || project.error} onRetry={() => Promise.all([q.reload(), projects.reload(), projectId ? project.reload() : Promise.resolve()])} />;
  const projectMap = Object.fromEntries((projects.data || []).map((p) => [p.id, p]));
  const manager = (role) => ["truong_nhom", "pho_nhom"].includes(role);
  const visibleTasks = (q.data || []).filter((task) => !filterId || task.projectId === filterId);
  const readOnly = requestedReadOnly;

  const totalPages = Math.max(1, Math.ceil(visibleTasks.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedTasks = visibleTasks.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const restore = async (t) => {
    setError(""); setBusyId(t.id);
    try { await api.restoreTask(t.id, reasons[t.id]); await q.reload(); } catch (e) { setError(e.message); } finally { setBusyId(null); }
  };
  return (
    <section>
      <header className="cn-banner">
        <div className="cn-bg cn-bg-aut" /><div className="cn-bg cn-bg-win" />
        <SeasonScene />
        <div className="cn-title">
          <h1>Task đã hủy</h1>
          <p>{readOnly ? `${project.data?.project?.ten || "Công việc"} · Chỉ xem các task đã hủy.` : "Task bị hủy vẫn được giữ lại. Lọc theo công việc để tìm task; nhóm trưởng và phó nhóm có thể khôi phục khi cần."}</p>
          <span className="cn-count"><Archive size={14} aria-hidden="true" />{q.data?.length || 0} task</span>
        </div>
      </header>
      {error && <ErrorBox message={error} onRetry={() => setError("")} />}
      {!readOnly && (projects.data || []).length > 1 && <label className="cn-filter"><FolderKanban size={18} aria-hidden="true" />Công việc<select value={filterId} onChange={(e) => { setFilterId(e.target.value); setPage(1); }}><option value="">Tất cả công việc</option>{projects.data.map((p) => <option key={p.id} value={p.id}>{p.ten}</option>)}</select></label>}
      {!visibleTasks.length ? (
        <EmptyState title="Chưa có task nào bị hủy">Khi một task bị hủy, nó sẽ nằm ở đây.</EmptyState>
      ) : (
        <>
          <div className="cn-list">
            {pagedTasks.map((t) => {
              const n = (reasons[t.id] || "").trim().length;
              const canRestore = !readOnly && manager(projectMap[t.projectId]?.vai_tro) && projectMap[t.projectId]?.trang_thai !== "luu_tru";
              return (
                <article className="card cn-item" key={t.id}>
                  <div className="cn-top">
                    <span className="cn-st"><CircleX size={14} aria-hidden="true" />Đã hủy</span>
                    {/* Task đã hủy bị khóa nên cap_nhat_luc chính là thời điểm hủy (huy_task đặt cap_nhat_luc=now()) */}
                    <time className="cn-time" dateTime={t.cap_nhat_luc}><Clock size={14} aria-hidden="true" />Hủy lúc {vnTime(t.cap_nhat_luc)}</time>
                  </div>
                  <h2>{t.tieu_de || "Task giao cho bạn"}</h2>
                  <p className="cn-project"><FolderKanban size={15} aria-hidden="true" />{projectMap[t.projectId]?.ten || "Công việc không còn trong danh sách"}</p>
                  <div className="cn-why"><b>Lý do hủy</b><p>{t.ly_do_huy || "Không ghi lý do"}</p></div>
                  {readOnly && <button onClick={() => navigate(`/history/${t.projectId}/task/${t.id}`)}>Xem chi tiết</button>}
                  {canRestore && (
                    <div className="cn-restore">
                      <label>Lý do khôi phục
                        <input maxLength={1000} value={reasons[t.id] || ""} placeholder="Ví dụ: yêu cầu đã thay đổi, cần làm lại" onChange={(e) => setReasons({ ...reasons, [t.id]: e.target.value })} />
                      </label>
                      <span className="cn-hint">{n < MIN ? `Cần thêm ${MIN - n} ký tự (tối thiểu ${MIN})` : "Đủ điều kiện khôi phục"}</span>
                      <button className="primary" disabled={n < MIN || busyId === t.id} onClick={() => restore(t)}><RotateCcw size={16} aria-hidden="true" />Khôi phục task</button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {totalPages > 1 && (
            <nav className="cn-pagination" aria-label="Phân trang task đã hủy">
              <button
                type="button"
                className="cn-page-btn"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Trang trước"
              >
                <ChevronLeft size={16} />
                <span>Trước</span>
              </button>

              <div className="cn-page-info">
                Trang <b>{currentPage}</b> / {totalPages}
                <small>({visibleTasks.length} task)</small>
              </div>

              <button
                type="button"
                className="cn-page-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Trang sau"
              >
                <span>Sau</span>
                <ChevronRight size={16} />
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
