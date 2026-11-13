import { PieChart, BarChart3, Medal, AlarmClock, Circle, Loader, Eye, CircleCheck, CircleX } from "lucide-react";
import { Avatar } from "../common";
import { STATES } from "../../lib/constants";
import { vnDue } from "../../lib/format";
import "../../styles/report-charts.css";

const ORDER = ["can_lam", "dang_lam", "cho_duyet", "hoan_thanh", "da_huy"];
const ICON = { can_lam: Circle, dang_lam: Loader, cho_duyet: Eye, hoan_thanh: CircleCheck, da_huy: CircleX };
const COLOR = { can_lam: "#0ea5e9", dang_lam: "#eab308", cho_duyet: "#f97316", hoan_thanh: "#22c55e", da_huy: "#a855f7" };
const PEOPLE = ["#7c3aed", "#0d9488", "#f59e0b", "#0ea5e9", "#e11d48"]; // luôn kèm tên + số bằng chữ

const Head = ({ Icon, tone, title, sub }) => (
  <header className="rc-head">
    <span className={`rc-ico ${tone}`}><Icon size={18} aria-hidden="true" /></span>
    <div><h2>{title}</h2><small>{sub}</small></div>
  </header>
);

/* 1. Vòng tròn: task theo trạng thái */
function StatusDonut({ tasks }) {
  const total = tasks.length,
    counts = ORDER.map((s) => [s, tasks.filter((t) => t.trang_thai === s).length]),
    done = counts.find(([s]) => s === "hoan_thanh")[1],
    shown = counts.filter(([, n]) => n > 0),
    gap = shown.length > 1 ? 1.2 : 0,
    segs = shown.map(([s, n], i) => ({ s, len: Math.max((n / total) * 100 - gap, 0.1), start: (shown.slice(0, i).reduce((sum, [, m]) => sum + m, 0) / total) * 100 }));
  return (
    <section className="rc-card">
      <Head Icon={PieChart} tone="violet" title="Tình trạng task" sub="Chia theo trạng thái" />
      <div className="rc-donut">
        <svg viewBox="0 0 120 120" role="img" aria-label={`${done} trên ${total} task đã hoàn thành`}>
          <circle className="rc-ring" cx="60" cy="60" r="46" pathLength="100" />
          {segs.map(({ s, len, start }) => <circle key={s} className="rc-seg" cx="60" cy="60" r="46" pathLength="100" stroke={COLOR[s]} style={{ strokeDasharray: `${len} ${100 - len}`, strokeDashoffset: -start }} />)}
        </svg>
        <div className="rc-center"><b>{total ? Math.round((done / total) * 100) : 0}%</b><span>hoàn thành</span></div>
      </div>
      <ul className="rc-legend">
        {counts.map(([s, n]) => {
          const I = ICON[s];
          return <li key={s}><i style={{ background: COLOR[s] }} /><I size={14} aria-hidden="true" />{STATES[s] || s}<b>{n}</b></li>;
        })}
      </ul>
    </section>
  );
}

/* 2. Thanh ngang: tiến độ từng task, hạn gần nhất lên trước */
function TaskBars({ tasks }) {
  const sorted = [...tasks].sort((a, b) => (a.han_chot ? new Date(a.han_chot) : Infinity) - (b.han_chot ? new Date(b.han_chot) : Infinity)),
    shown = sorted.slice(0, 7);
  return (
    <section className="rc-card">
      <Head Icon={BarChart3} tone="sky" title="Tiến độ từng task" sub="Hạn chót gần nhất lên trước" />
      <ul className="rc-rows">
        {shown.map((t) => {
          const pct = Math.min(100, Math.max(0, Number(t.tien_do || 0))),
            late = t.han_chot && !["hoan_thanh", "da_huy"].includes(t.trang_thai) && new Date(t.han_chot) < new Date(),
            I = ICON[t.trang_thai] || Circle;
          return (
            <li key={t.task_id}>
              <div className="rc-row-top"><strong title={t.tieu_de}>{t.tieu_de || "Task giao cho bạn"}</strong><b>{pct.toFixed(0)}%</b></div>
              <div className="rc-track"><i style={{ width: `${pct}%`, background: COLOR[t.trang_thai] }} /></div>
              <div className="rc-meta">
                <span className="rc-chip" style={{ "--c": COLOR[t.trang_thai] }}><I size={14} aria-hidden="true" />{STATES[t.trang_thai] || t.trang_thai}</span>
                {late ? <span className="rc-late"><AlarmClock size={14} aria-hidden="true" />Quá hạn</span> : null}
                <span>{t.han_chot ? `Hạn ${vnDue(t.han_chot, false)}` : "Chưa đặt hạn"}</span>
              </div>
            </li>
          );
        })}
      </ul>
      {tasks.length > shown.length && <p className="rc-more">và {tasks.length - shown.length} task nữa ở danh sách bên dưới</p>}
    </section>
  );
}

/* 3. Bảng điểm thành viên */
function ScoreBars({ members }) {
  const ranked = [...members].sort((a, b) => (Number(b.diem?.diem) || -1) - (Number(a.diem?.diem) || -1)),
    max = Math.max(1, ...ranked.map((m) => Number(m.diem?.diem) || 0));
  return (
    <section className="rc-card">
      <Head Icon={Medal} tone="amber" title="Bảng điểm" sub="Xếp theo điểm cao đến thấp" />
      <ol className="rc-rank">
        {ranked.map((m, i) => {
          const has = m.diem?.diem != null, score = Number(m.diem?.diem) || 0;
          return (
            <li key={m.member_id}>
              <span className="rc-pos">{i + 1}</span>
              <Avatar name={m.ho_ten} src={m.anh_dai_dien} />
              <div className="rc-who">
                <div className="rc-row-top"><strong>{m.ho_ten}</strong><b>{has ? score : "Chưa có"}</b></div>
                <div className="rc-track"><i style={{ width: `${(score / max) * 100}%`, background: PEOPLE[i % PEOPLE.length] }} /></div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default function ReportCharts({ tasks, members }) {
  return (
    <div className="rc-grid">
      {tasks.length > 0 && <StatusDonut tasks={tasks} />}
      {tasks.length > 0 && <TaskBars tasks={tasks} />}
      {members.length > 0 && <ScoreBars members={members} />}
    </div>
  );
}