import { useState } from "react";
import { CalendarClock, AlarmClock, UserRound, Lock, ChevronRight, AlertTriangle } from "lucide-react";
import Avatar from "../common/Avatar";
import { vnDue, isLateTask } from "../../lib/format";
const day = (d) => vnDue(d, false);
export default function TaskCard({ task, onOpen, locked = false, mine = false }) {
  const [note, setNote] = useState(false);
  const pct = Math.min(100, Math.max(0, Number(task.tien_do ?? 0)));
  const assignments = task.assignees || [];
  const people = assignments.filter((a) => a.trang_thai === "dang_lam" && a.member?.trang_thai === "dang_tham_gia" && a.member?.ho_ten);
  const missingDueToKick = ["can_lam", "dang_lam"].includes(task.trang_thai) && assignments.some((a) => a.member?.trang_thai === "da_roi" && a.member?.ly_do_roi === "bi_loai");
  const late = isLateTask(task);
  // Task của người khác (thành viên thường): chặn ngay tại thẻ, không chuyển trang rồi mới báo lỗi. Quy tắc khớp server: trưởng/phó, người được giao, hoặc task chưa giao.
  const open = () => (locked ? setNote(true) : onOpen?.(task.id));
  return (
    <article className={`task-card${locked ? " locked" : ""}`} tabIndex="0" aria-disabled={locked || undefined} onClick={open} onKeyDown={(e) => e.key === "Enter" && open()}>
      {locked && <Lock size={14} className="kb-lock" aria-label="Bạn không xem được chi tiết task này" />}
      <h3>{task.tieu_de || "Task"}</h3>
      {!locked && <ChevronRight className="kb-go" size={20} aria-hidden="true" />}
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
      {locked && note && <p className="kb-note" role="status"><Lock size={14} aria-hidden="true" />Task này do {people[0]?.member.ho_ten || "người khác"} làm nên bạn không xem được chi tiết.</p>}
      <div className="kb-tags">
        {missingDueToKick && <span className="kb-vacancy"><AlertTriangle size={14} aria-hidden="true" />Thiếu người · đã bị kick</span>}
        {task.han_chot && (
          <span className={`kb-due ${late ? "late" : ""}`}>
            {late ? <AlarmClock size={14} /> : <CalendarClock size={14} />}
            {late ? "Quá hạn" : "Hạn"} {day(task.han_chot)}
          </span>
        )}
        {mine && <span className="kb-mine"><UserRound size={14} aria-hidden="true" />Của bạn</span>}
      </div>
    </article>
  );
}
