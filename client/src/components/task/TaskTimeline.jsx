import { useEffect, useMemo, useState } from "react";
import { ArrowDown, CalendarRange, Info } from "lucide-react";

const vnParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const vnDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = Object.fromEntries(vnParts.formatToParts(date).map((part) => [part.type, part.value]));
  return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
};
const labelDate = (value) => new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit" }).format(new Date(value));
const dayMs = 86400000;
const initialNow = Date.now();
const stateLabel = { can_lam: "Cần làm", dang_lam: "Đang làm", cho_duyet: "Chờ duyệt", hoan_thanh: "Hoàn thành" };

export default function TaskTimeline({ tasks = [], onOpen, canOpen }) {
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const chart = useMemo(() => {
    if (!tasks.length) return null;
    const today = vnDate(now);
    const rows = tasks.map((task) => {
      const start = vnDate(task.tao_luc) ?? today;
      const due = vnDate(task.han_chot);
      return { task, start, end: Math.max(start, due ?? today), progress: Math.min(100, Math.max(0, Number(task.tien_do) || 0)) };
    });
    const min = rows.reduce((value, row) => Math.min(value, row.start), rows[0].start);
    let max = rows.reduce((value, row) => Math.max(value, row.end), today);
    if (max - min < 6 * dayMs) max = min + 6 * dayMs;
    const span = max - min;
    return {
      today: Math.max(0, Math.min(100, ((today - min) / span) * 100)),
      ticks: Array.from({ length: 7 }, (_, index) => min + (span * index) / 6),
      rows: rows.map((row) => ({
        ...row,
        left: Math.max(0, Math.min(100, ((row.start - min) / span) * 100)),
        width: Math.max(1, Math.min(100, ((row.end - row.start) / span) * 100)),
      })),
    };
  }, [tasks, now]);
  const visible = expanded ? chart?.rows : chart?.rows.slice(0, 8);

  return (
    <section className="kb-timeline" id="kb-timeline" aria-labelledby="kb-timeline-title">
      <div className="kb-timeline-head">
        <div className="kb-timeline-title">
          <span><CalendarRange size={19} /></span>
          <div><h2 id="kb-timeline-title">Tiến độ theo thời gian</h2><p>Lịch được dựng từ ngày tạo, hạn chót và tiến độ hiện tại của từng task.</p></div>
        </div>
        <details className="kb-timeline-guide">
          <summary><Info size={16} />Cách đọc lịch<ArrowDown size={14} /></summary>
          <div className="kb-timeline-popover">Đầu thanh là ngày tạo, cuối thanh là hạn chót; phần màu đậm thể hiện % hoàn thành hiện tại. Vạch tím chỉ hôm nay. Task chưa đặt hạn được tính đến hôm nay.</div>
        </details>
      </div>
      {!chart ? <p className="kb-timeline-empty">Chưa có task để hiển thị lịch tiến độ.</p> : <div className="kb-timeline-scroll">
        <div className="kb-timeline-chart">
          <div className="kb-timeline-axis"><span>Task</span><div>{chart.ticks.map((tick, index) => <span key={index}>{labelDate(tick)}</span>)}</div></div>
          <div className="kb-timeline-rows">
            {visible.map(({ task, left, width, progress }) => {
              const content = <><span className="kb-timeline-name"><b>{task.tieu_de || "Task"}</b><small>{stateLabel[task.trang_thai] || "Task"} · {task.han_chot ? `Hạn ${labelDate(task.han_chot)}` : "Chưa đặt hạn"}</small></span><span className="kb-timeline-track"><i className="kb-today-line" style={{ left: `${chart.today}%` }} aria-hidden="true" /><span className="kb-timeline-bar" data-state={task.trang_thai} style={{ left: `${left}%`, width: `${width}%` }} title={`${progress}% hoàn thành`}><i style={{ width: `${progress}%` }} /></span></span></>;
              return canOpen?.(task) ? <button type="button" className="kb-timeline-row" key={task.id} onClick={() => onOpen?.(task.id)} aria-label={`Mở task ${task.tieu_de || "Task"}, trạng thái ${stateLabel[task.trang_thai] || ""}, ${progress}% hoàn thành`}>{content}</button> : <div className="kb-timeline-row" key={task.id}>{content}</div>;
            })}
          </div>
        </div>
      </div>}
      {chart?.rows.length > 8 && <button type="button" className="kb-timeline-more" onClick={() => setExpanded((value) => !value)}>{expanded ? "Thu gọn lịch" : `Xem thêm ${chart.rows.length - 8} task`}</button>}
    </section>
  );
}
