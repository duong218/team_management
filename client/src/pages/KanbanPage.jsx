import { useState } from "react";
import { useAsync, useTasks, useMembers, useProject } from "../hooks";
import { getMyMember } from "../api/members";
import { ErrorBox, Skeleton, EmptyState } from "../components/common";
import KanbanBoard from "../components/task/KanbanBoard";
import TaskForm from "../components/task/TaskForm";
import * as tasksApi from "../api/tasks";
import { startTask, submitTask, approveTask } from "../api/tasks";
export default function KanbanPage({ projectId, navigate }) {
  const q = useTasks(projectId);
  const members = useMembers(projectId), project = useProject(projectId), me = useAsync(() => getMyMember(projectId), [projectId]);
  const [error, setError] = useState("");
  if (q.loading || members.loading || project.loading) return <Skeleton />;
  if (q.error || members.error || project.error) return <ErrorBox message={q.error || members.error || project.error} onRetry={() => Promise.all([q.reload(), members.reload(), project.reload()])} />;
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
    catch (e) { setError(e.message); }
  }
  return (
    <div className="kanban">
      <h1>Bảng công việc</h1>
      {error && <ErrorBox message={error} onRetry={q.reload} />}
      {manager && <details className="card"><summary>Tạo task</summary><TaskForm members={members.data?.filter((m) => m.trang_thai === "dang_tham_gia") || []} onSubmit={createTask} /></details>}
      {!q.data?.length && <EmptyState title="Chưa có công việc">Tạo task để bắt đầu theo dõi.</EmptyState>}
      <KanbanBoard
        tasks={q.data}
        onMove={moveTask}
        onOpen={(id) => navigate(`/task/${id}`)}
        canOpen={(t) => manager || !t.assignees?.length || !me.data?.id || t.assignees.some((a) => a.member_id === me.data.id)}
        hint={
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