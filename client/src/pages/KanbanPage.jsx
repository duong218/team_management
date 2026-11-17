import { useEffect, useRef, useState } from "react";
import { useAsync, useTasks, useMembers, useProject } from "../hooks";
import { getMyMember } from "../api/members";
import { ErrorBox, Skeleton, EmptyState } from "../components/common";
import KanbanBoard from "../components/task/KanbanBoard";
import TaskForm from "../components/task/TaskForm";
import * as tasksApi from "../api/tasks";
import { startTask, submitTask, approveTask } from "../api/tasks";
import TaskCelebration from "../components/task/TaskCelebration";
import { CircleAlert, X, Plus, ShieldCheck } from "lucide-react";
import TaskTimeline from "../components/task/TaskTimeline";
import ReturnTaskDialog from "../components/task/ReturnTaskDialog";
export default function KanbanPage({ projectId, navigate, readOnly = false, onVacancyCountChange }) {
  const q = useTasks(projectId);
  const members = useMembers(projectId), project = useProject(projectId), me = useAsync(() => getMyMember(projectId), [projectId]);
  const [error, setError] = useState(""), [toast, setToast] = useState(null), [celebrating, setCelebrating] = useState(false), [createOpen, setCreateOpen] = useState(false), dialogRef = useRef(null);
  const [returningTask, setReturningTask] = useState(null);
  useEffect(() => {
    if (readOnly || !q.data) return;
    const count = q.data.filter((task) =>
      ["can_lam", "dang_lam"].includes(task.trang_thai) &&
      (task.assignees || []).some((item) => item.member?.trang_thai === "da_roi" && item.member?.ly_do_roi === "bi_loai"),
    ).length;
    onVacancyCountChange?.({ projectId, count });
  }, [projectId, q.data, readOnly, onVacancyCountChange]);
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
    const completing = target === "hoan_thanh" && task.trang_thai === "cho_duyet" && manager;
    if (target === "dang_lam" && task.trang_thai === "cho_duyet") {
      if (!manager) { setError("Chỉ trưởng/phó nhóm mới được trả task về Đang làm."); return; }
      setReturningTask(task);
      return;
    }
    setError("");
    try { if (target === "dang_lam" && task.trang_thai === "can_lam") await startTask(id); else if (target === "cho_duyet" && task.trang_thai === "dang_lam") await submitTask(id); else if (completing) await approveTask(id); else throw new Error("Chuyển trạng thái này cần thao tác trong chi tiết task."); if (completing) setCelebrating(true); await q.reload(); }
    catch (e) {
      if (target === "cho_duyet" || (target === "dang_lam" && task.trang_thai === "can_lam")) {
        setToast({ message: e.message || "Bạn không thể bắt đầu task này." });
      } else setError(e.message);
    }
  }
  async function confirmReturn(reason) {
    try {
      await tasksApi.returnTask(returningTask.id, reason);
      await q.reload();
      setReturningTask(null);
      return true;
    } catch (e) {
      return e.message || "Không thể trả lại task. Vui lòng thử lại.";
    }
  }
  return (
    <div className="kanban">
      {manager && !viewOnly && <ReturnTaskDialog key={returningTask?.id ?? "closed"} task={returningTask} onCancel={() => setReturningTask(null)} onConfirm={confirmReturn} />}
      {celebrating && <TaskCelebration />}
      {toast && <div className="kb-toast" role="alert"><CircleAlert size={19} /><span>{toast.message}</span><button aria-label="Đóng thông báo" onClick={() => setToast(null)}><X size={17} /></button></div>}
      {viewOnly && <p className="card" role="note">Công việc đã kết thúc. Bảng này chỉ để xem. <button onClick={() => navigate(`/history/${projectId}/cancelled`)}>Xem task đã hủy</button></p>}
      {error && <ErrorBox message={error} onRetry={q.reload} />}
      <dialog ref={dialogRef} className="kb-create-dialog" aria-labelledby="kb-create-title" onClose={() => setCreateOpen(false)} onClick={(e) => e.target === dialogRef.current && setCreateOpen(false)}>
        {createOpen && <div className="kb-create-body"><header><span><Plus size={18} /></span><h2 id="kb-create-title">Tạo task mới</h2><button type="button" className="kb-create-close" aria-label="Đóng cửa sổ" onClick={() => setCreateOpen(false)}><X size={18} /></button></header><TaskForm members={members.data?.filter((m) => m.trang_thai === "dang_tham_gia") || []} onSubmit={createTask} onClose={() => setCreateOpen(false)} /></div>}
      </dialog>
      {!q.data?.length && <EmptyState title="Chưa có công việc">Tạo task để bắt đầu theo dõi.</EmptyState>}
      <KanbanBoard
        tasks={q.data}
        members={members.data || []}
        projectName={project.data?.project?.ten || "Bảng công việc"}
        meId={me.data?.id}
        onCreateTask={manager && !viewOnly ? () => setCreateOpen(true) : undefined}
        onMove={viewOnly ? undefined : moveTask}
        onOpen={(id) => navigate(viewOnly ? `/history/${projectId}/task/${id}` : `/task/${id}`)}
        readOnly={viewOnly}
        canOpen={(t) => manager || !t.assignees?.length || !me.data?.id || t.assignees.some((a) => a.member_id === me.data.id)}
      />
      {!viewOnly && <section className="kb-practice" aria-labelledby="kb-practice-title">
        <header><span><ShieldCheck size={19} /></span><div><h2 id="kb-practice-title">Cách xử lý khi áp dụng thực tế</h2><p>Quy trình ngắn để chuyển task đúng bước.</p></div></header>
        <ol>
          <li><b>1</b><span>Người được giao bắt đầu bằng cách kéo task sang <strong>Đang làm</strong>.</span></li>
          <li><b>2</b><span>Hoàn tất checklist và gắn minh chứng, sau đó chuyển sang <strong>Chờ duyệt</strong>.</span></li>
          <li><b>3</b><span>{manager ? <>Nhóm trưởng hoặc phó nhóm kéo task từ <strong>Chờ duyệt</strong> sang <strong>Hoàn thành</strong> để duyệt; muốn trả lại, kéo về <strong>Đang làm</strong> và nhập lý do.</> : <>Nhóm trưởng hoặc phó nhóm sẽ xem task đã gửi duyệt, sau đó chuyển sang <strong>Hoàn thành</strong> hoặc trả lại kèm lý do.</>}</span></li>
        </ol>
      </section>}
      <TaskTimeline tasks={q.data || []} onOpen={(id) => navigate(viewOnly ? `/history/${projectId}/task/${id}` : `/task/${id}`)} canOpen={(t) => viewOnly || manager || !t.assignees?.length || !me.data?.id || t.assignees.some((a) => a.member_id === me.data.id)} />
    </div>
  );
}
