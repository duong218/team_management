import { useAsync, useProject, useTasks } from "../hooks";
import { getMyMember, listCurrentMembers } from "../api/members";
import { Avatar, EmptyState, ErrorBox, Skeleton } from "../components/common";
import { ROLES, STATES } from "../lib/constants";
import { vnDue } from "../lib/format";
import { ArrowRight, BarChart3, CalendarClock, LayoutGrid, Users } from "lucide-react";
import "../styles/project-dashboard.css";

const MANAGERS = ["truong_nhom", "pho_nhom"];
const ORDER = ["can_lam", "dang_lam", "cho_duyet", "hoan_thanh"];
const taskDue = (task) => task.han_chot ? new Date(task.han_chot).getTime() : Number.MAX_SAFE_INTEGER;

export default function ProjectDashboardPage({ projectId, name, navigate }) {
  const project = useProject(projectId);
  const tasks = useTasks(projectId);
  const members = useAsync(() => listCurrentMembers(projectId), [projectId]);
  const me = useAsync(() => getMyMember(projectId), [projectId]);

  if (project.loading || tasks.loading || members.loading || me.loading) return <Skeleton label="Đang tải tổng quan công việc…" />;
  const error = project.error || tasks.error || members.error || me.error;
  if (error) return <ErrorBox message={error} onRetry={() => Promise.all([project.reload(), tasks.reload(), members.reload(), me.reload()])} />;

  const info = project.data?.project;
  const role = project.data?.vaiTro;
  if (!info || !role) return <ErrorBox message="Bạn không còn là thành viên của công việc này." onRetry={() => navigate("/projects")} />;

  const manager = MANAGERS.includes(role);
  const allTasks = tasks.data || [];
  const ownTasks = allTasks.filter((task) => task.assignees?.some((assignee) => assignee.member_id === me.data?.id && assignee.trang_thai === "dang_lam"));
  const counts = Object.fromEntries(ORDER.map((state) => [state, allTasks.filter((task) => task.trang_thai === state).length]));
  const ownCounts = Object.fromEntries(ORDER.map((state) => [state, ownTasks.filter((task) => task.trang_thai === state).length]));
  const needsAttention = manager
    ? allTasks.filter((task) => task.trang_thai === "cho_duyet").sort((a, b) => taskDue(a) - taskDue(b))
    : ownTasks.filter((task) => ["can_lam", "dang_lam", "cho_duyet"].includes(task.trang_thai)).sort((a, b) => taskDue(a) - taskDue(b));
  const done = allTasks.filter((task) => task.trang_thai === "hoan_thanh").length;
  const progress = allTasks.length ? Math.round((done / allTasks.length) * 100) : 0;
  const activeMembers = members.data || [];

  return (
    <section className="pd">
      <header className="pd-head">
        <div className="pd-title">
          <h1>{info.ten}</h1>
          <p>{role === "thanh_vien" ? `Chào ${name || "bạn"}, đây là phần việc và tiến độ của nhóm.` : "Theo dõi tiến độ, duyệt task và điều phối công việc của nhóm."}</p>
        </div>
        <div className="pd-actions">
          <span className="pd-role">{ROLES[role] || role}</span>
          {manager && <button type="button" onClick={() => navigate(`/project/${projectId}/manage`)}><Users size={17} aria-hidden="true" />Quản lý nhóm</button>}
          {manager && <button type="button" onClick={() => navigate(`/project/${projectId}/report`)}><BarChart3 size={17} aria-hidden="true" />Báo cáo</button>}
          {!manager && <button type="button" onClick={() => navigate(`/project/${projectId}/manage`)}><Users size={17} aria-hidden="true" />Thành viên</button>}
          <button type="button" className="primary" onClick={() => navigate(`/project/${projectId}`)}><LayoutGrid size={17} aria-hidden="true" />Mở bảng Kanban</button>
        </div>
      </header>

      <section className="pd-summary" aria-label="Tóm tắt tiến độ">
        <Summary label={manager ? "Task chờ duyệt" : "Task được giao cho bạn"} value={manager ? counts.cho_duyet : ownTasks.length} tone="review" />
        <Summary label="Đang làm" value={manager ? counts.dang_lam : ownCounts.dang_lam} tone="working" />
        <Summary label="Đã hoàn thành" value={manager ? counts.hoan_thanh : ownCounts.hoan_thanh} tone="done" />
        <Summary label="Thành viên" value={activeMembers.length} tone="people" />
      </section>

      <div className="pd-grid">
        <section className="pd-panel pd-focus">
          <div className="pd-panel-head">
            <div>
              <h2>{manager ? "Task cần duyệt" : "Việc của bạn"}</h2>
              <p>{manager ? "Task thành viên đã gửi lên để nhóm xem xét." : "Các task đang được giao cho bạn, sắp xếp theo hạn gần nhất."}</p>
            </div>
            <span className="pd-count">{needsAttention.length}</span>
          </div>
          {needsAttention.length ? (
            <ul className="pd-task-list">
              {needsAttention.slice(0, 6).map((task) => <TaskRow key={task.id} task={task} onOpen={() => navigate(`/task/${task.id}`)} />)}
            </ul>
          ) : (
            <EmptyState title={manager ? "Chưa có task chờ duyệt" : "Chưa có task đang làm"}>
              {manager ? "Task sẽ xuất hiện ở đây khi thành viên gửi duyệt." : "Khi task được giao cho bạn, bạn có thể theo dõi tại đây."}
            </EmptyState>
          )}
          {needsAttention.length > 6 && <button className="pd-more" type="button" onClick={() => navigate(`/project/${projectId}`)}>Xem toàn bộ {needsAttention.length} task <ArrowRight size={16} aria-hidden="true" /></button>}
        </section>

        <aside className="pd-side">
          <section className="pd-panel pd-progress">
              <h2>Tiến độ nhóm</h2>
            <div className="pd-progress-line"><strong>{progress}%</strong><span>{done}/{allTasks.length} task hoàn thành</span></div>
            <div className="pd-bar" role="img" aria-label={`${progress}% task hoàn thành`}>
              {ORDER.map((state) => counts[state] > 0 && <span key={state} data-state={state} style={{ flexGrow: counts[state] }} />)}
            </div>
            <ul className="pd-legend">
              {ORDER.map((state) => <li key={state} data-state={state}><span>{STATES[state]}</span><b>{counts[state]}</b></li>)}
            </ul>
          </section>

          <section className="pd-panel pd-team">
            <div className="pd-panel-head">
              <div><h2>Thành viên trong nhóm</h2><p>{activeMembers.length} người đang tham gia</p></div>
              <Users size={19} aria-hidden="true" />
            </div>
            {activeMembers.length ? <ul>{activeMembers.slice(0, 5).map((member) => <li key={member.member_id}><Avatar name={member.ho_ten} src={member.anh_dai_dien} /><span>{member.ho_ten || "Thành viên"}</span><small>{ROLES[member.vai_tro] || "Thành viên"}</small></li>)}</ul> : <p className="pd-muted">Chưa có thành viên.</p>}
            {activeMembers.length > 5 && <button className="pd-more" type="button" onClick={() => navigate(`/project/${projectId}/manage`)}>Xem danh sách thành viên</button>}
          </section>
        </aside>
      </div>
    </section>
  );
}

function Summary({ label, value, tone }) {
  return <div className="pd-metric" data-tone={tone}><span>{label}</span><strong>{value}</strong></div>;
}

function TaskRow({ task, onOpen }) {
  const due = task.han_chot ? new Date(task.han_chot) : null;
  const compareTime = task.trang_thai === "cho_duyet" && task.cap_nhat_luc ? new Date(task.cap_nhat_luc) : new Date();
  const late = due && task.trang_thai !== "hoan_thanh" && due < compareTime;
  return (
    <li>
      <button className="pd-task" type="button" onClick={onOpen}>
        <span className="pd-task-copy"><strong>{task.tieu_de || "Task"}</strong><small>{STATES[task.trang_thai] || task.trang_thai}</small></span>
        <span className="pd-task-meta"><span className={`pd-task-progress${late ? " is-late" : ""}`}><span style={{ width: `${Math.max(0, Math.min(100, Number(task.tien_do) || 0))}%` }} /></span><b>{Math.round(Number(task.tien_do) || 0)}%</b></span>
        <span className={`pd-task-due${late ? " is-late" : ""}`}>{due ? <><CalendarClock size={15} aria-hidden="true" />{late ? "Quá hạn" : vnDue(task.han_chot, false)}</> : "Chưa đặt hạn"}</span>
        <ArrowRight className="pd-task-arrow" size={17} aria-hidden="true" />
      </button>
    </li>
  );
}
