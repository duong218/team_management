import { useState } from "react";
import { CircleX, RotateCcw, Archive, Clock } from "lucide-react";
import { useAsync, useProject } from "../hooks";
import * as api from "../api/tasks";
import { ErrorBox, Skeleton, EmptyState } from "../components/common";
import { vnTime } from "../lib/format";
import SeasonScene from "../components/task/SeasonScene";
import "../styles/cancelled.css";
const MIN = 10;
export default function CancelledTasksPage({ projectId, readOnly: requestedReadOnly = false, navigate }) {
  const q = useAsync(() => api.listCancelledTasks(projectId), [projectId]);
  const project = useProject(projectId);
  const [reasons, setReasons] = useState({}), [error, setError] = useState(""), [busyId, setBusyId] = useState(null);
  if (q.loading || project.loading) return <Skeleton />;
  if (q.error || project.error) return <ErrorBox message={q.error || project.error} onRetry={() => Promise.all([q.reload(), project.reload()])} />;
  const readOnly = requestedReadOnly || project.data?.project?.trang_thai === "luu_tru";
  const manager = ["truong_nhom", "pho_nhom"].includes(project.data?.vaiTro);
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
          <p>{readOnly ? "Task đã hủy trong công việc đã kết thúc · Chỉ xem." : "Task bị hủy vẫn được giữ lại. Nhóm trưởng và phó nhóm có thể khôi phục khi cần."}</p>
          <span className="cn-count"><Archive size={14} aria-hidden="true" />{q.data?.length || 0} task</span>
        </div>
      </header>
      {error && <ErrorBox message={error} onRetry={() => setError("")} />}
      {!q.data?.length ? (
        <EmptyState title="Chưa có task nào bị hủy">Khi một task bị hủy, nó sẽ nằm ở đây.</EmptyState>
      ) : (
        <div className="cn-list">
          {q.data.map((t) => {
            const n = (reasons[t.id] || "").trim().length;
            return (
              <article className="card cn-item" key={t.id}>
                <div className="cn-top">
                  <span className="cn-st"><CircleX size={14} aria-hidden="true" />Đã hủy</span>
                  {/* Task đã hủy bị khóa nên cap_nhat_luc chính là thời điểm hủy (huy_task đặt cap_nhat_luc=now()) */}
                  <time className="cn-time" dateTime={t.cap_nhat_luc}><Clock size={14} aria-hidden="true" />Hủy lúc {vnTime(t.cap_nhat_luc)}</time>
                </div>
                <h2>{t.tieu_de || "Task giao cho bạn"}</h2>
                <div className="cn-why"><b>Lý do hủy</b><p>{t.ly_do_huy || "Không ghi lý do"}</p></div>
                {readOnly && <button onClick={() => navigate(`/history/${projectId}/task/${t.id}`)}>Xem chi tiết</button>}
                {!readOnly && manager && (
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
      )}
    </section>
  );
}
