import { useState } from "react";
import { Download, Users, ListChecks, CircleCheck, Gauge, Circle, Loader, Eye, CircleX, AlarmClock, Crown, ShieldCheck, User, Trophy } from "lucide-react";
import { useReport } from "../hooks";
import { ErrorBox, Skeleton, EmptyState, Avatar } from "../components/common";
import { largestRemainder, vnDue } from "../lib/format";
import { ROLES, STATES } from "../lib/constants";
import ReportCharts from "../components/report/ReportCharts";
import "../styles/report.css";
import ReportScene from "../components/report/ReportScene";

const ST_ICON = { can_lam: Circle, dang_lam: Loader, cho_duyet: Eye, hoan_thanh: CircleCheck, da_huy: CircleX };
const ROLE_ICON = { truong_nhom: Crown, pho_nhom: ShieldCheck, thanh_vien: User };
const MEMBER_ST = { dang_tham_gia: "Đang tham gia", da_roi: "Đã rời nhóm" };
const SEG = ["#7c3aed", "#0d9488", "#f59e0b", "#0ea5e9", "#e11d48"]; // màu đoạn đóng góp; luôn kèm tên + % bằng chữ

export default function ReportPage({ projectId }) {
  const q = useReport(projectId);
  const [exportError, setExportError] = useState("");
  async function exportReport() {
    setExportError("");
    try { const { downloadExcelReport } = await import("../lib/excel"); await downloadExcelReport(q.data); }
    catch { setExportError("Không thể tạo file Excel. Hãy thử lại."); }
  }
  if (q.loading) return <Skeleton />;
  if (q.error) return <ErrorBox message={q.error} onRetry={q.reload} />;
  if (!q.data) return <EmptyState title="Chưa có báo cáo" />;
  const members = q.data.members || [], tasks = q.data.tasks || [];
  const done = tasks.filter((t) => t.trang_thai === "hoan_thanh").length;
  const avg = tasks.length ? tasks.reduce((s, t) => s + Number(t.tien_do || 0), 0) / tasks.length : 0;
  const maxScore = Math.max(1, ...members.map((m) => Number(m.diem?.diem) || 0));
  const stats = [
    ["violet", Users, members.length, "Thành viên"],
    ["sky", ListChecks, tasks.length, "Task"],
    ["green", CircleCheck, `${done}/${tasks.length}`, "Task hoàn thành"],
    ["amber", Gauge, `${avg.toFixed(0)}%`, "Tiến độ trung bình"],
  ];
  return <section className="rp">
    <header className="rp-head">
      <ReportScene members={members} />
      <div className="rp-title"><p className="rp-kicker">TỔNG QUAN CÔNG VIỆC</p><h1>Báo cáo</h1><p className="rp-project-name">{q.data.project?.ten}</p></div>
      <button className="primary" onClick={exportReport}><Download size={16} aria-hidden="true" />Xuất Excel (.xlsx)</button>
    </header>
    {exportError && <ErrorBox message={exportError} onRetry={exportReport} />}
    {!members.length && !tasks.length ? <EmptyState title="Chưa có dữ liệu báo cáo" /> : <>
      <div className="rp-stats">{stats.map(([tone, Icon, value, label]) => <div key={label} className={`rp-stat rp-${tone}`}><span className="rp-ico"><Icon size={22} aria-hidden="true" /></span><div><b>{value}</b><span>{label}</span></div></div>)}</div>

      <ReportCharts tasks={tasks} members={members} />

      <h2 className="rp-h"><span className="rp-ico rp-ico-sm rp-violet"><Trophy size={18} aria-hidden="true" /></span>Thành viên <span className="rp-count">{members.length}</span></h2>
      <div className="rp-members">{members.map((m, i) => {
        const RI = ROLE_ICON[m.vai_tro] || User, score = Number(m.diem?.diem) || 0, has = m.diem?.diem != null;
        return <article key={m.member_id} className={`rp-member rp-c${i % 5}`}>
          <Avatar name={m.ho_ten} src={m.anh_dai_dien} />
          <div className="rp-mname"><strong>{m.ho_ten}</strong>
            <div className="rp-chips"><span className={`rp-role rp-role-${m.vai_tro}`}><RI size={14} aria-hidden="true" />{ROLES[m.vai_tro] || m.vai_tro}</span>
              <span className="rp-muted">{MEMBER_ST[m.trang_thai] || m.trang_thai}</span></div></div>
          <div className="rp-score"><b>{has ? score : "Chưa có"}</b><span>điểm</span>
            <div className="progress" aria-hidden="true"><span style={{ width: `${(score / maxScore) * 100}%` }} /></div></div>
        </article>;
      })}</div>

      <h2 className="rp-h"><span className="rp-ico rp-ico-sm rp-sky"><ListChecks size={18} aria-hidden="true" /></span>Task <span className="rp-count">{tasks.length}</span></h2>
      <div className="rp-tasks">{tasks.map((t) => {
        const contribution = largestRemainder(Object.entries((t.checklist || []).filter((c) => c.da_xong && c.nguoi_hoan_thanh).reduce((acc, c) => { acc[c.nguoi_hoan_thanh] = (acc[c.nguoi_hoan_thanh] || 0) + Number(c.trong_so); return acc; }, {})).map(([id, value]) => ({ id, value })));
        const SI = ST_ICON[t.trang_thai] || Circle, pct = Number(t.tien_do || 0);
        const late = t.han_chot && !["hoan_thanh", "da_huy"].includes(t.trang_thai) && new Date(t.han_chot) < new Date();
        const nameOf = (id) => t.assignees?.find((a) => a.member_id === id)?.ho_ten || "Thành viên";
        return <article key={t.task_id} className={`card rp-task rp-t-${t.trang_thai}`}>
          <div className="rp-chips"><span className={`rp-st rp-st-${t.trang_thai}`}><SI size={14} aria-hidden="true" />{STATES[t.trang_thai] || t.trang_thai}</span>
            {late && <span className="rp-st rp-st-late"><AlarmClock size={14} aria-hidden="true" />Quá hạn</span>}</div>
          <h3>{t.tieu_de || "Task giao cho bạn"}</h3>
          <div className="rp-bar"><div className="progress"><span style={{ width: `${pct}%` }} /></div><b>{pct.toFixed(0)}%</b></div>
          <p className="rp-muted">Hạn {vnDue(t.han_chot)}{t.assignees?.length > 0 && <> · {t.assignees.map((a) => a.ho_ten).filter(Boolean).join(", ")}</>}</p>
          {contribution.length > 0 ? <>
            <div className="rp-stack" aria-hidden="true">{contribution.map((c, i) => <span key={c.id} style={{ width: `${c.percent}%`, background: SEG[i % SEG.length] }} />)}</div>
            <ul className="rp-legend">{contribution.map((c, i) => <li key={c.id}><i style={{ background: SEG[i % SEG.length] }} />{nameOf(c.id)}: <b>{c.percent}%</b></li>)}</ul>
          </> : <small className="rp-muted">Chưa có đóng góp được ghi nhận.</small>}
        </article>;
      })}</div>
    </>}
    <p className="hint">Điểm là thước đo tương đối theo công thức của nhóm; link minh chứng không được hệ thống xác thực nội dung.</p>
  </section>;
}
