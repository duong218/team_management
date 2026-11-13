import { useEffect, useState, useMemo } from "react";
import { useAsync, useProject, useTasks } from "../hooks";
import { getMyMember, listCurrentMembers } from "../api/members";
import { Avatar, EmptyState, ErrorBox, Skeleton } from "../components/common";
import { ROLES, STATES } from "../lib/constants";
import { vnDue } from "../lib/format";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  LayoutGrid,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  TrendingUp,
  Sparkles,
  Inbox,
  Activity,
  ChevronRight,
  Layers,
  Award
} from "lucide-react";
import "../styles/project-dashboard.css";

const MANAGERS = ["truong_nhom", "pho_nhom"];
const ORDER = ["can_lam", "dang_lam", "cho_duyet", "hoan_thanh"];

const STATE_CONFIG = {
  can_lam: {
    label: "Cần làm",
    color: "#0284c7",
    bg: "#f0f9ff",
    border: "#bae6fd",
    icon: Inbox
  },
  dang_lam: {
    label: "Đang làm",
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fde68a",
    icon: Flame
  },
  cho_duyet: {
    label: "Chờ duyệt",
    color: "#ea580c",
    bg: "#fff7ed",
    border: "#fed7aa",
    icon: Clock
  },
  hoan_thanh: {
    label: "Hoàn thành",
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#bbf7d0",
    icon: CheckCircle2
  }
};

const taskDue = (task) => (task.han_chot ? new Date(task.han_chot).getTime() : Number.MAX_SAFE_INTEGER);

export default function ProjectDashboardPage({ projectId, name, navigate }) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, []);

  const project = useProject(projectId);
  const tasks = useTasks(projectId);
  const members = useAsync(() => listCurrentMembers(projectId), [projectId]);
  const me = useAsync(() => getMyMember(projectId), [projectId]);

  if (project.loading || tasks.loading || members.loading || me.loading) {
    return <Skeleton label="Đang tải tổng quan công việc…" />;
  }
  const error = project.error || tasks.error || members.error || me.error;
  if (error) {
    return (
      <ErrorBox
        message={error}
        onRetry={() => Promise.all([project.reload(), tasks.reload(), members.reload(), me.reload()])}
      />
    );
  }

  const info = project.data?.project;
  const role = project.data?.vaiTro;
  if (!info || !role) {
    return (
      <ErrorBox
        message="Bạn không còn là thành viên của công việc này."
        onRetry={() => navigate("/projects")}
      />
    );
  }

  const manager = MANAGERS.includes(role);
  const allTasks = tasks.data || [];
  const ownTasks = allTasks.filter((task) =>
    task.assignees?.some(
      (assignee) => assignee.member_id === me.data?.id && assignee.trang_thai === "dang_lam"
    )
  );

  const counts = Object.fromEntries(
    ORDER.map((state) => [state, allTasks.filter((task) => task.trang_thai === state).length])
  );
  const ownCounts = Object.fromEntries(
    ORDER.map((state) => [state, ownTasks.filter((task) => task.trang_thai === state).length])
  );

  const activeMembers = members.data || [];
  const doneCount = allTasks.filter((task) => task.trang_thai === "hoan_thanh").length;
  const totalTasks = allTasks.length;
  const progressPercent = totalTasks ? Math.round((doneCount / totalTasks) * 100) : 0;

  // Task quá hạn
  const overdueTasks = allTasks.filter((task) => {
    if (!task.han_chot || ["hoan_thanh", "da_huy"].includes(task.trang_thai)) return false;
    return now > 0 && taskDue(task) < now;
  });

  // Task cần tập trung xử lý
  const needsAttention = manager
    ? allTasks
        .filter((task) => task.trang_thai === "cho_duyet" || (now > 0 && taskDue(task) < now && task.trang_thai !== "hoan_thanh"))
        .sort((a, b) => taskDue(a) - taskDue(b))
    : ownTasks
        .filter((task) => ["can_lam", "dang_lam", "cho_duyet"].includes(task.trang_thai))
        .sort((a, b) => taskDue(a) - taskDue(b));

  // Task sắp đến hạn (trong vòng 3 ngày tới): Thành viên thường chỉ thấy task của chính mình
  const upcomingSource = manager ? allTasks : ownTasks;
  const upcomingTasks = upcomingSource
    .filter((task) => {
      if (!task.han_chot || ["hoan_thanh", "da_huy"].includes(task.trang_thai)) return false;
      const t = taskDue(task);
      return t >= now && t - now <= 3 * 86400 * 1000;
    })
    .sort((a, b) => taskDue(a) - taskDue(b))
    .slice(0, 4);

  // Phân bổ khối lượng thành viên
  const workloads = activeMembers
    .map((member) => {
      const byState = Object.fromEntries(ORDER.map((state) => [state, 0]));
      allTasks.forEach((task) => {
        if (
          task.assignees?.some(
            (assignee) => assignee.member_id === member.member_id && assignee.trang_thai === "dang_lam"
          ) &&
          byState[task.trang_thai] !== undefined
        ) {
          byState[task.trang_thai] += 1;
        }
      });
      const total = Object.values(byState).reduce((sum, count) => sum + count, 0);
      const done = byState.hoan_thanh || 0;
      const rate = total ? Math.round((done / total) * 100) : 0;
      return { ...member, byState, total, done, rate };
    })
    .sort((a, b) => b.total - a.total || (a.ho_ten || "").localeCompare(b.ho_ten || "", "vi"));

  const maxWorkload = Math.max(1, ...workloads.map((member) => member.total));

  // Tính toán donut chart SVG
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;
  const donutSlices = ORDER.map((st) => {
    const val = counts[st] || 0;
    const pct = totalTasks ? val / totalTasks : 0;
    const strokeDasharray = `${pct * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedOffset;
    accumulatedOffset += pct * circumference;
    return {
      state: st,
      count: val,
      percent: Math.round(pct * 100),
      strokeDasharray,
      strokeDashoffset,
      color: STATE_CONFIG[st].color
    };
  });

  return (
    <section className="pd-dashboard">
      {/* 1. Header Hero Banner */}
      <header className="pd-hero-banner">
        <div className="pd-hero-glow" aria-hidden="true" />
        <div className="pd-hero-content">
          <div className="pd-hero-tag">
            <span className="pd-pulse-dot" />
            <span>{ROLES[role] || role}</span>
            <span className="pd-hero-sep">•</span>
            <span>{activeMembers.length} thành viên đang tham gia</span>
          </div>
          <h1 className="pd-hero-title">{info.ten}</h1>
          <p className="pd-hero-desc">
            {manager
              ? "Trung tâm chỉ huy & điều phối tiến độ: Quản lý phân bổ task, phê duyệt sản phẩm và phát hiện rủi ro trễ hạn."
              : `Chào ${name || "bạn"}, đây là toàn cảnh tiến độ của nhóm và danh sách việc bạn đang đảm nhận.`}
          </p>
        </div>

        <div className="pd-hero-actions">
          {manager && (
            <button
              type="button"
              className="pd-btn-glass"
              onClick={() => navigate(`/project/${projectId}/manage`)}
            >
              <Users size={16} />
              Quản lý nhóm
            </button>
          )}
          {manager && (
            <button
              type="button"
              className="pd-btn-glass"
              onClick={() => navigate(`/project/${projectId}/report`)}
            >
              <BarChart3 size={16} />
              Báo cáo chi tiết
            </button>
          )}
          <button
            type="button"
            className="pd-btn-primary"
            onClick={() => navigate(`/project/${projectId}`)}
          >
            <LayoutGrid size={16} />
            Mở bảng Kanban
            <ArrowRight size={15} />
          </button>
        </div>
      </header>

      {/* 2. Key Metrics Row */}
      <section className="pd-metrics-strip" aria-label="Chỉ số quan trọng">
        <MetricCard
          title="Tổng số công việc"
          value={totalTasks}
          subtext={`${doneCount} task đã hoàn thành`}
          icon={Layers}
          tone="sky"
          trend={`${progressPercent}%`}
        />
        <MetricCard
          title="Đang triển khai"
          value={counts.dang_lam}
          subtext="Đang được team tích cực thực hiện"
          icon={Flame}
          tone="amber"
          badge="Đang chạy"
        />
        <MetricCard
          title="Chờ duyệt nghiệm thu"
          value={counts.cho_duyet}
          subtext={counts.cho_duyet > 0 ? "Cần trưởng/phó nhóm xem xét" : "Không có task tồn đọng"}
          icon={Clock}
          tone="orange"
          badge={counts.cho_duyet > 0 ? "Cần duyệt ngay" : "Sạch"}
          urgent={counts.cho_duyet > 0}
        />
        <MetricCard
          title="Cảnh báo quá hạn"
          value={overdueTasks.length}
          subtext={overdueTasks.length > 0 ? "Task vượt quá thời hạn cam kết" : "Đúng tiến độ 100%"}
          icon={AlertTriangle}
          tone="rose"
          urgent={overdueTasks.length > 0}
        />
      </section>

      {/* 3. Main Analytics Grid */}
      <div className="pd-main-grid">
        {/* Cột trái: Donut Chart + Task cần ưu tiên */}
        <div className="pd-col-left">
          {/* Card Biểu đồ hình khuyên phân bố trạng thái */}
          <section className="pd-card pd-card-chart">
            <div className="pd-card-header">
              <div>
                <h2>Tiến độ tổng thể</h2>
                <p>Tỷ lệ hoàn thành và cấu trúc trạng thái task</p>
              </div>
              <span className="pd-badge-pill">
                <TrendingUp size={14} />
                {progressPercent}% Hoàn thành
              </span>
            </div>

            <div className="pd-chart-container">
              {/* Vòng tròn Donut SVG */}
              <div className="pd-donut-wrap">
                <svg className="pd-donut-svg" viewBox="0 0 160 160">
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    fill="transparent"
                    stroke="#e2e8f0"
                    strokeWidth="18"
                  />
                  {totalTasks > 0 ? (
                    donutSlices.map((slice) =>
                      slice.count > 0 ? (
                        <circle
                          key={slice.state}
                          cx="80"
                          cy="80"
                          r={radius}
                          fill="transparent"
                          stroke={slice.color}
                          strokeWidth="18"
                          strokeDasharray={slice.strokeDasharray}
                          strokeDashoffset={slice.strokeDashoffset}
                          strokeLinecap="round"
                          className="pd-donut-segment"
                        />
                      ) : null
                    )
                  ) : null}
                </svg>
                <div className="pd-donut-center">
                  <span className="pd-donut-number">{progressPercent}%</span>
                  <span className="pd-donut-caption">
                    {doneCount}/{totalTasks} task
                  </span>
                </div>
              </div>

              {/* Chi tiết từng thanh trạng thái */}
              <div className="pd-chart-bars">
                {ORDER.map((state) => {
                  const cfg = STATE_CONFIG[state];
                  const Icon = cfg.icon;
                  const c = counts[state] || 0;
                  const pct = totalTasks ? Math.round((c / totalTasks) * 100) : 0;
                  return (
                    <div key={state} className="pd-chart-row">
                      <div className="pd-row-meta">
                        <span className="pd-state-tag" style={{ color: cfg.color, background: cfg.bg }}>
                          <Icon size={14} />
                          {cfg.label}
                        </span>
                        <div className="pd-row-vals">
                          <strong>{c}</strong>
                          <small>({pct}%)</small>
                        </div>
                      </div>
                      <div className="pd-row-track">
                        <div
                          className="pd-row-fill"
                          style={{
                            width: `${pct}%`,
                            background: cfg.color
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Card Task cần chú ý / Task của tôi */}
          <section className="pd-card pd-card-tasks">
            <div className="pd-card-header">
              <div>
                <h2>{manager ? "Công việc cần ưu tiên xử lý" : "Danh sách việc của bạn"}</h2>
                <p>
                  {manager
                    ? "Các task đang chờ xét duyệt hoặc có nguy cơ chậm tiến độ"
                    : "Task được phân công cho bạn, sắp xếp theo thời hạn gần nhất"}
                </p>
              </div>
              <span className="pd-count-bubble">{needsAttention.length}</span>
            </div>

            {needsAttention.length ? (
              <ul className="pd-urgent-list">
                {needsAttention.slice(0, 6).map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    now={now}
                    onOpen={() => navigate(`/task/${task.id}`)}
                  />
                ))}
              </ul>
            ) : (
              <div className="pd-empty-state">
                <CheckCircle2 size={44} className="pd-empty-icon" />
                <h3>Mọi việc đang diễn ra thuận lợi</h3>
                <p>
                  {manager
                    ? "Hiện không có task nào bị quá hạn hoặc cần chờ phê duyệt."
                    : "Bạn đã giải quyết hết các task hiện tại! Hãy nghỉ ngơi hoặc nhận thêm việc mới."}
                </p>
              </div>
            )}

            {needsAttention.length > 6 && (
              <button
                className="pd-btn-view-all"
                type="button"
                onClick={() => navigate(`/project/${projectId}`)}
              >
                Xem toàn bộ {needsAttention.length} task trên Kanban
                <ArrowRight size={16} />
              </button>
            )}
          </section>
        </div>

        {/* Cột phải: Hạn chót & Khối lượng phân bổ */}
        <aside className="pd-col-right">
          {/* Card Sắp đến hạn */}
          <section className="pd-card pd-card-deadline">
            <div className="pd-card-header">
              <div>
                <h2>{manager ? "Hạn chót sắp tới" : "Hạn chót của bạn"}</h2>
                <p>{manager ? "Các task toàn nhóm sắp đến hạn trong 3 ngày tới" : "Task bạn phụ trách sắp đến hạn (3 ngày tới)"}</p>
              </div>
              <CalendarClock size={20} className="pd-icon-muted" />
            </div>

            {upcomingTasks.length > 0 ? (
              <div className="pd-deadline-list">
                {upcomingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="pd-deadline-item"
                    onClick={() => navigate(`/task/${task.id}`)}
                  >
                    <div className="pd-deadline-left">
                      <strong>{task.tieu_de || "Task"}</strong>
                      <div className="pd-deadline-sub">
                        <span
                          className="pd-badge-micro"
                          style={{
                            color: STATE_CONFIG[task.trang_thai]?.color,
                            background: STATE_CONFIG[task.trang_thai]?.bg
                          }}
                        >
                          {STATES[task.trang_thai]}
                        </span>
                        <span>• {vnDue(task.han_chot, false)}</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="pd-arrow-subtle" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="pd-empty-text">
                {manager
                  ? "Không có task nào cận hạn trong 3 ngày tới."
                  : "Bạn không có task nào cận hạn trong 3 ngày tới."}
              </p>
            )}
          </section>

          {/* Card Phân bổ công việc thành viên (Workload Distribution) */}
          <section className="pd-card pd-card-workload">
            <div className="pd-card-header">
              <div>
                <h2>Phân bổ thành viên</h2>
                <p>Khối lượng và tỷ lệ hoàn thành theo nhân sự</p>
              </div>
              <Activity size={20} className="pd-icon-muted" />
            </div>

            <div className="pd-workload-scroll">
              {workloads.map((member) => {
                const fillRatio = (member.total / maxWorkload) * 100;
                return (
                  <div key={member.member_id} className="pd-member-row">
                    <div className="pd-member-info">
                      <Avatar name={member.ho_ten} src={member.anh_dai_dien} size={32} />
                      <div className="pd-member-text">
                        <strong>{member.ho_ten || "Thành viên"}</strong>
                        <small>{ROLES[member.vai_tro] || "Thành viên"}</small>
                      </div>
                      <div className="pd-member-stats">
                        <span className="pd-member-total">{member.total} task</span>
                        <span className="pd-member-rate">{member.rate}% xong</span>
                      </div>
                    </div>

                    {/* Thanh thanh xếp chồng phân bố task của thành viên */}
                    <div className="pd-member-stacked-bar">
                      <div className="pd-stacked-track" style={{ width: `${Math.max(12, fillRatio)}%` }}>
                        {ORDER.map((st) => {
                          const count = member.byState[st] || 0;
                          if (!count) return null;
                          return (
                            <span
                              key={st}
                              title={`${STATES[st]}: ${count}`}
                              style={{
                                flexGrow: count,
                                background: STATE_CONFIG[st].color
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chú giải trạng thái */}
            <div className="pd-workload-legend">
              {ORDER.map((st) => (
                <span key={st}>
                  <i style={{ background: STATE_CONFIG[st].color }} />
                  {STATES[st]}
                </span>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

function MetricCard({ title, value, subtext, icon: Icon, tone, badge, urgent, trend }) {
  return (
    <article className={`pd-kpi-card tone-${tone} ${urgent ? "is-urgent" : ""}`}>
      <div className="pd-kpi-top">
        <span className="pd-kpi-icon">
          <Icon size={20} />
        </span>
        {badge && <span className="pd-kpi-badge">{badge}</span>}
        {trend && <span className="pd-kpi-trend">{trend}</span>}
      </div>
      <div className="pd-kpi-bottom">
        <strong className="pd-kpi-number">{value}</strong>
        <span className="pd-kpi-title">{title}</span>
        <small className="pd-kpi-sub">{subtext}</small>
      </div>
    </article>
  );
}

function TaskItem({ task, now, onOpen }) {
  const due = task.han_chot ? new Date(task.han_chot) : null;
  const compareTime =
    task.trang_thai === "cho_duyet" && task.cap_nhat_luc ? new Date(task.cap_nhat_luc) : new Date();
  const late = due && task.trang_thai !== "hoan_thanh" && due < compareTime;
  const cfg = STATE_CONFIG[task.trang_thai] || STATE_CONFIG.can_lam;
  const pct = Math.max(0, Math.min(100, Number(task.tien_do) || 0));

  return (
    <li className={`pd-task-card ${late ? "is-overdue" : ""}`} onClick={onOpen}>
      <div className="pd-tc-left">
        <span className="pd-tc-status" style={{ color: cfg.color, background: cfg.bg }}>
          {cfg.label}
        </span>
        <strong className="pd-tc-title">{task.tieu_de || "Task không có tiêu đề"}</strong>
        <div className="pd-tc-meta">
          {due && (
            <span className={`pd-tc-due ${late ? "late" : ""}`}>
              <CalendarClock size={13} />
              {late ? "Đã trễ hạn: " : "Hạn: "}
              {vnDue(task.han_chot, false)}
            </span>
          )}
          {task.assignees?.length > 0 && (
            <span className="pd-tc-assignees">
              • {task.assignees.map((a) => a.member?.ho_ten || "Thành viên").join(", ")}
            </span>
          )}
        </div>
      </div>

      <div className="pd-tc-right">
        <div className="pd-tc-progress-box">
          <div className="pd-tc-bar">
            <span style={{ width: `${pct}%`, background: late ? "#e11d48" : cfg.color }} />
          </div>
          <span className="pd-tc-pct">{pct}%</span>
        </div>
        <ChevronRight size={18} className="pd-tc-arrow" />
      </div>
    </li>
  );
}
