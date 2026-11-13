import { LogOut, ListChecks, LayoutGrid, Users, BarChart3, Archive, PanelLeftClose, PanelLeftOpen, Gauge } from "lucide-react";
import { useEffect, useState } from "react";
import { saveAvatar } from "./api/profile";
import { useAuth, useProfile, useHashRoute, useNotifications } from "./hooks";
import { ErrorBox, Skeleton, Avatar } from "./components/common";
import Logo from "./components/common/Logo";
import NotificationBell from "./components/common/NotificationBell";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import ProjectListPage from "./pages/ProjectListPage";
import KanbanPage from "./pages/KanbanPage";
import TaskDetailPage from "./pages/TaskDetailPage";
import ManagePage from "./pages/ManagePage";
import ReportPage from "./pages/ReportPage";
import NotificationsPage from "./pages/NotificationsPage";
import CancelledTasksPage from "./pages/CancelledTasksPage";
import HistoryPage from "./pages/HistoryPage";
import ProjectDashboardPage from "./pages/ProjectDashboardPage";
export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const auth = useAuth(),
    profile = useProfile(auth.data?.id),
    { route, navigate } = useHashRoute(),
    notes = useNotifications(auth.data?.id);
  const photo = auth.data?.user_metadata?.avatar_url || auth.data?.user_metadata?.picture;
  useEffect(() => {
    // đồng bộ ảnh Google lên hồ sơ để người khác trong nhóm thấy; lỗi thì bỏ qua, lần đăng nhập sau thử lại
    if (profile.data && photo && profile.data.anh_dai_dien !== photo) saveAvatar(photo).catch(() => {});
  }, [profile.data, photo]);
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
        onSaved={() => {
          navigate("/projects");
          profile.reload();
        }}
      />
    );
  const parts = route.split("/").filter(Boolean),
    projectId = parts[1],
    taskId = parts[0] === "history" && parts[2] === "task" ? parts[3] : parts[1],
    historyMode = parts[0] === "history";
  let screen;
  if (route === "/projects" || route === "/")
    screen = (
      <ProjectListPage
        user={auth.data}
        name={profile.data.ho_ten}
        duocTao={profile.data.duoc_tao_cong_viec}
        navigate={navigate}
      />
    );
  else if (parts[0] === "project" && parts[2] === "manage")
    screen = <ManagePage projectId={projectId} navigate={navigate} />;
  else if (parts[0] === "project" && parts[2] === "dashboard")
    screen = <ProjectDashboardPage projectId={projectId} name={profile.data.ho_ten} navigate={navigate} />;
  else if (parts[0] === "project" && parts[2] === "report")
    screen = <ReportPage projectId={projectId} />;
  else if (parts[0] === "project" && parts[2] === "cancelled")
    screen = <CancelledTasksPage projectId={projectId} />;
  else if (route === "/history")
    screen = <HistoryPage userId={auth.data.id} navigate={navigate} />;
  else if (historyMode && parts[2] === "cancelled")
    screen = <CancelledTasksPage projectId={projectId} readOnly navigate={navigate} />;
  else if (historyMode && parts[2] === "task")
    screen = <TaskDetailPage taskId={taskId} readOnly />;
  else if (historyMode && projectId)
    screen = <KanbanPage projectId={projectId} navigate={navigate} readOnly />;
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
  const inProject = parts[0] === "project",
    base = `#/project/${projectId}`,
    sub = parts[2] || "",
    link = (href, Icon, label, active, extra) => (
      <a className="nav-link" href={href} aria-label={label} title={sidebarCollapsed ? label : undefined} aria-current={active ? "page" : undefined}>
        <Icon size={18} strokeWidth={1.8} />
        <span className="nav-text">{label}</span>
        {extra}
      </a>
    );
  return (
    <div className={`app-shell${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="sidebar-head">
          <a href="#/projects" className="brand" aria-label="Ocean and Gem - Công việc của tôi" title={sidebarCollapsed ? "Ocean and Gem" : undefined}>
            <Logo className="brand-logo" />
            <span>Ocean and Gem</span>
          </a>
          <button className="sidebar-toggle" type="button" aria-label={sidebarCollapsed ? "Mở rộng menu" : "Thu gọn menu"} aria-expanded={!sidebarCollapsed} title={sidebarCollapsed ? "Mở rộng menu" : "Thu gọn menu"} onClick={() => setSidebarCollapsed((value) => !value)}>
            {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>
        {link("#/projects", ListChecks, "Công việc của tôi", route === "/projects" || route === "/")}
        {link("#/history", Archive, "Lịch sử công việc", historyMode)}
        {inProject && (
          <>
            <div className="nav-label">Công việc đang mở</div>
            {link(`${base}/dashboard`, Gauge, "Tổng quan", sub === "dashboard")}
            {link(base, LayoutGrid, "Bảng Kanban", !sub)}
            {link(`${base}/manage`, Users, "Thành viên trong nhóm", sub === "manage")}
            {link(`${base}/report`, BarChart3, "Báo cáo", sub === "report")}
            {link(`${base}/cancelled`, Archive, "Task đã hủy", sub === "cancelled")}
          </>
        )}
      </aside>
      <div className="main">
        <header className="topbar">
          <NotificationBell notes={notes} />
          <div className="user-chip">
            <Avatar name={profile.data.ho_ten} src={photo} />
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
