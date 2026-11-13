import { useEffect, useRef, useState } from "react";
import { useAsync, useTasks, useMembers, useProject } from "../hooks";
import { getMyMember } from "../api/members";
import { ErrorBox, Skeleton, EmptyState } from "../components/common";
import KanbanBoard from "../components/task/KanbanBoard";
import TaskForm from "../components/task/TaskForm";
import * as tasksApi from "../api/tasks";
import { startTask, submitTask, approveTask } from "../api/tasks";
import { CircleAlert, X, Plus } from "lucide-react";
export default function KanbanPage({ projectId, navigate, readOnly = false }) {
  const q = useTasks(projectId);
  const members = useMembers(projectId), project = useProject(projectId), me = useAsync(() => getMyMember(projectId), [projectId]);
  const [error, setError] = useState(""), [toast, setToast] = useState(null), [createOpen, setCreateOpen] = useState(false), dialogRef = useRef(null);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (createOpen && !dialog.open) dialog.showModal();
    if (!createOpen && dialog.open) dialog.close();
  }, [createOpen, q.loading, members.loading, project.loading]);
  if (q.loading || members.loading || project.loading) return <Skeleton />;
  if (q.error || members.error || project.error) return <ErrorBox message={q.error || members.error || project.error} onRetry={() => Promise.all([q.reload(), members.reload(), project.reload()])} />;
  const viewOnly = readOnly || project.data?.project?.trang_thai === "luu_tru";
  const manager = ["truong_nhom", "pho_nhom"].includes(project.data?.vaiTro);
  async function createTask({ title, desc, due, checklist, assignee }) {
    setError("");
    try { if (assignee) await tasksApi.createAssignedTask(projectId, title, desc, due, checklist.map((noi_dung) => ({ noi_dung })), assignee); else await tasksApi.createTask(projectId, title, desc, due, checklist.map((noi_dung) => ({ noi_dung }))); await q.reload(); }
    catch (e) { setError(e.message); throw e; }
  }
  async function moveTask(id, target) {
    const task = q.data.find((x) => x.id === id); if (!task || target === task.trang_thai) return;
    setError("");
    try { if (target === "dang_lam" && task.trang_thai === "can_lam") await startTask(id); else if (target === "cho_duyet" && task.trang_thai === "dang_lam") await submitTask(id); else if (target === "hoan_thanh" && task.trang_thai === "cho_duyet" && manager) await approveTask(id); else throw new Error("Chuyển trạng thái này cần thao tác trong chi tiết task."); await q.reload(); }
    catch (e) { if (target === "cho_duyet") setToast({ message: e.message }); else setError(e.message); }
  }
  return (
    <div className="kanban">
      {toast && <div className="kb-toast" role="alert"><CircleAlert size={19} /><span>{toast.message}</span><button aria-label="Đóng thông báo" onClick={() => setToast(null)}><X size={17} /></button></div>}
      <h1>{project.data?.project?.ten || "Bảng công việc"}</h1>
      {viewOnly && <p className="card" role="note">Công việc đã kết thúc. Bảng này chỉ để xem. <button onClick={() => navigate(`/history/${projectId}/cancelled`)}>Xem task đã hủy</button></p>}
      {error && <ErrorBox message={error} onRetry={q.reload} />}
      <dialog ref={dialogRef} className="kb-create-dialog" aria-labelledby="kb-create-title" onClose={() => setCreateOpen(false)} onClick={(e) => e.target === dialogRef.current && setCreateOpen(false)}>
        {createOpen && <div className="kb-create-body"><header><span><Plus size={18} /></span><h2 id="kb-create-title">Tạo task mới</h2><button type="button" className="kb-create-close" aria-label="Đóng cửa sổ" onClick={() => setCreateOpen(false)}><X size={18} /></button></header><TaskForm members={members.data?.filter((m) => m.trang_thai === "dang_tham_gia") || []} onSubmit={createTask} onClose={() => setCreateOpen(false)} /></div>}
      </dialog>
      {!q.data?.length && <EmptyState title="Chưa có công việc">Tạo task để bắt đầu theo dõi.</EmptyState>}
      <KanbanBoard
        tasks={q.data}
        onCreateTask={manager && !viewOnly ? () => setCreateOpen(true) : undefined}
        onMove={viewOnly ? undefined : moveTask}
        onOpen={(id) => navigate(viewOnly ? `/history/${projectId}/task/${id}` : `/task/${id}`)}
        readOnly={viewOnly}
        canOpen={(t) => manager || !t.assignees?.length || !me.data?.id || t.assignees.some((a) => a.member_id === me.data.id)}
        hint={viewOnly ? null :
          <ol className="kb-tip" aria-label="Hướng dẫn kéo thả">
            <li><i data-state="dang_lam">1</i><span>Task được giao cho bạn: kéo thẻ sang <b>Đang làm</b> để bắt đầu.</span></li>
            <li><i data-state="cho_duyet">2</i><span>Tick hết checklist (kèm link minh chứng), rồi kéo sang <b>Chờ duyệt</b> để gửi nhóm trưởng/phó duyệt.</span></li>
            {manager && <li><i data-state="hoan_thanh">3</i><span><em>Nhóm trưởng/phó:</em> duyệt xong, kéo sang <b>Hoàn thành</b> để công nhận và cộng điểm cho thành viên. Không tự duyệt task của mình; muốn trả lại hoặc mở lại thì vào chi tiết task, nhập lý do.</span></li>}
          </ol>
        }
      />
    </div>
  );
}
