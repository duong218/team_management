import { STATES } from "../../lib/constants";
export default function TaskCard({ task, onOpen }) {
  const pct = Math.min(100, Math.max(0, Number(task.tien_do ?? 0)));
  return (
    <article className="task-card" tabIndex="0" onClick={() => onOpen?.(task.id)}>
      <h3>{task.tieu_de || "Task"}</h3>
      <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className="meta">
        <span className={`chip ${task.trang_thai}`}>{STATES[task.trang_thai] || task.trang_thai}</span>
        <span>{pct}%</span>
      </div>
    </article>
  );
}
