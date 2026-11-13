import { CalendarClock, AlarmClock, UserRound } from "lucide-react";
import Avatar from "../common/Avatar";
import { vnDue } from "../../lib/format";
const day = (d) => vnDue(d, false);
export default function TaskCard({ task, onOpen }) {
  const pct = Math.min(100, Math.max(0, Number(task.tien_do ?? 0))),
    people = (task.assignees || []).filter((a) => a.member?.ho_ten),
    // Chờ duyệt: so hạn với giờ GỬI duyệt (cap_nhat_luc, task bị khóa nên không đổi) — trưởng nhóm duyệt chậm không làm thành viên bị trễ.
    ref = task.trang_thai === "cho_duyet" && task.cap_nhat_luc ? new Date(task.cap_nhat_luc) : new Date(),
    late = task.han_chot && task.trang_thai !== "hoan_thanh" && new Date(task.han_chot) < ref;
  return (
    <article className="task-card" tabIndex="0" onClick={() => onOpen?.(task.id)}>
      <h3>{task.tieu_de || "Task"}</h3>
      <div className="kb-who">
        {people.length ? (
          <>
            <span className="kb-avatars">{people.slice(0, 3).map((a) => <Avatar key={a.member_id} name={a.member.ho_ten} src={a.member.anh_dai_dien} size="sm" />)}</span>
            <span className="kb-name">{people[0].member.ho_ten}{people.length > 1 ? ` +${people.length - 1}` : ""}</span>
          </>
        ) : (
          <span className="kb-name kb-none"><UserRound size={14} />Chưa có người</span>
        )}
      </div>
      <div className="kb-prog">
        <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${pct}%` }} />
        </div>
        <b>{pct}%</b>
      </div>
      {task.han_chot && (
        <span className={`kb-due ${late ? "late" : ""}`}>
          {late ? <AlarmClock size={14} /> : <CalendarClock size={14} />}
          {late ? "Quá hạn" : "Hạn"} {day(task.han_chot)}
        </span>
      )}
    </article>
  );
}