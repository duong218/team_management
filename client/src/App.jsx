import { LogOut, ListChecks, LayoutGrid, Users, BarChart3, Archive, Bell } from "lucide-react";
import { useAuth, useProfile, useHashRoute, useNotifications } from "./hooks";
import { ErrorBox, Skeleton, Avatar } from "./components/common";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import ProjectListPage from "./pages/ProjectListPage";
import KanbanPage from "./pages/KanbanPage";
import TaskDetailPage from "./pages/TaskDetailPage";
import ManagePage from "./pages/ManagePage";
import ReportPage from "./pages/ReportPage";
import NotificationsPage from "./pages/NotificationsPage";
import CancelledTasksPage from "./pages/CancelledTasksPage";
export default function App() {
  const auth = useAuth(),
    profile = useProfile(auth.data?.id),
    { route, navigate } = useHashRoute(),
    notes = useNotifications(auth.data?.id);
  if (auth.loading) return <Skeleton label="Đang kiểm tra đăng nhập…" />;
  if (!auth.data) return <LoginPage />;
  if (profile.loading) return <Skeleton label="Đang tải hồ sơ…" />;
  if (profile.error)
    return <ErrorBox message={profile.error} onRetry={profile.reload} />;
  if (!profile.data)
    return (
      <ProfilePage
        user={auth.data}
        logout={auth.logout}
        onSaved={profile.reload}
      />
    );
  const parts = route.split("/").filter(Boolean),
    projectId = parts[1],
    taskId = parts[1];
  let screen;
  if (route === "/projects" || route === "/")
    screen = (
      <ProjectListPage
        user={auth.data}
        duocTao={profile.data.duoc_tao_cong_viec}
        navigate={navigate}
      />
    );
  else if (parts[0] === "project" && parts[2] === "manage")
    screen = <ManagePage projectId={projectId} navigate={navigate} />;
  else if (parts[0] === "project" && parts[2] === "report")
    screen = <ReportPage projectId={projectId} />;
  else if (parts[0] === "project" && parts[2] === "cancelled")
    screen = <CancelledTasksPage projectId={projectId} />;
  else if (parts[0] === "project")
    screen = (
      <>
        <KanbanPage projectId={projectId} navigate={navigate} />
      </>
    );
  else if (parts[0] === "task") screen = <TaskDetailPage taskId={taskId} />;
  else if (route === "/notifications")
    screen = <NotificationsPage userId={auth.data.id} />;
  else
    screen = (
      <ErrorBox
        message="Không tìm thấy màn hình."
        onRetry={() => navigate("/projects")}
      />
    );
  const unread = notes.data?.filter((n) => !n.da_doc).length || 0,
    inProject = parts[0] === "project",
    base = `#/project/${projectId}`,
    sub = parts[2] || "",
    link = (href, Icon, label, active, extra) => (
      <a className="nav-link" href={href} aria-current={active ? "page" : undefined}>
        <Icon size={18} strokeWidth={1.8} />
        {label}
        {extra}
      </a>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a href="#/projects" className="brand">
          <span className="brand-mark">N</span>
          <span>Nhóm mình</span>
        </a>
        {link("#/projects", ListChecks, "Công việc của tôi", route === "/projects" || route === "/")}
        {inProject && (
          <>
            <div className="nav-label">Công việc đang mở</div>
            {link(base, LayoutGrid, "Bảng Kanban", !sub)}
            {link(`${base}/manage`, Users, "Thành viên & quản lý", sub === "manage")}
            {link(`${base}/report`, BarChart3, "Báo cáo", sub === "report")}
            {link(`${base}/cancelled`, Archive, "Task đã hủy", sub === "cancelled")}
          </>
        )}
        <div className="nav-label">Khác</div>
        {link("#/notifications", Bell, "Thông báo", route === "/notifications", unread > 0 && <span className="badge">{unread}</span>)}
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="user-chip">
            <Avatar name={profile.data.ho_ten} />
            {profile.data.ho_ten}
          </div>
          <button className="icon-btn" aria-label="Đăng xuất" title="Đăng xuất" onClick={auth.logout}>
            <LogOut size={16} />
          </button>
        </header>
        <main className="content">{screen}</main>
      </div>
    </div>
  );
}
