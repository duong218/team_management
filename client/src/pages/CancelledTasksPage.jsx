import { useState } from "react";
import { useAsync, useProject } from "../hooks";
import * as api from "../api/tasks";
import { ErrorBox, Skeleton, EmptyState } from "../components/common";
export default function CancelledTasksPage({ projectId }) {
  const q = useAsync(() => api.listCancelledTasks(projectId), [projectId]);
  const project = useProject(projectId);
  const [reasons, setReasons] = useState({}), [error, setError] = useState("");
  if (q.loading || project.loading) return <Skeleton />;
  if (q.error || project.error) return <ErrorBox message={q.error || project.error} onRetry={() => Promise.all([q.reload(), project.reload()])} />;
  const manager = ["truong_nhom", "pho_nhom"].includes(project.data?.vaiTro);
  return (
    <section>
      <h1>Task đã hủy</h1>
      {!q.data?.length ? (
        <EmptyState />
      ) : (
        q.data.map((t) => (
          <article className="card" key={t.id}>
            <strong>{t.tieu_de || "Task giao cho bạn"}</strong><p>{t.ly_do_huy}</p>
            {manager && <><label>Lý do khôi phục<input maxLength={1000} value={reasons[t.id] || ""} onChange={(e) => setReasons({ ...reasons, [t.id]: e.target.value })} /></label><button disabled={(reasons[t.id] || "").trim().length < 10} onClick={async () => { setError(""); try { await api.restoreTask(t.id, reasons[t.id]); await q.reload(); } catch (e) { setError(e.message); } }}>Khôi phục task</button></>}
          </article>
        ))
      )}
      {error && <ErrorBox message={error} onRetry={q.reload} />}
    </section>
  );
}

