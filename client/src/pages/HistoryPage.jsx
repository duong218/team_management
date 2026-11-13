import { Archive, ArrowRight, Crown, Users } from "lucide-react";
import { useProjects } from "../hooks";
import { EmptyState, ErrorBox, Skeleton } from "../components/common";
import "../styles/history.css";

export default function HistoryPage({ userId, navigate }) {
  const projects = useProjects(userId);
  if (projects.loading) return <Skeleton />;
  if (projects.error) return <ErrorBox message={projects.error} onRetry={projects.reload} />;

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
              <button className="primary" onClick={() => navigate(`/history/${project.id}`)}>Xem bảng Kanban <ArrowRight size={16} /></button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
