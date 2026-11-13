import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import * as api from "../../api/notifications";
import { vnTime } from "../../lib/format";
export default function NotificationBell({ notes }) {
  const [open, setOpen] = useState(false),
    [fresh, setFresh] = useState([]),
    box = useRef(null),
    list = notes.data || [],
    unread = list.filter((n) => !n.da_doc);
  useEffect(() => {
    const t = setInterval(notes.reload, 30000);
    return () => clearInterval(t);
  }, [notes.reload]);
  useEffect(() => {
    if (!open) return;
    const away = (e) => !box.current?.contains(e.target) && setOpen(false),
      esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  async function toggle() {
    if (open) return setOpen(false);
    setFresh(unread.map((n) => n.id)); // nhớ cái nào mới để còn tô nổi bật
    setOpen(true);
    if (!unread.length) return;
    try {
      await Promise.all(unread.map((n) => api.markRead(n.id)));
      await notes.reload();
    } catch { /* lần mở sau sẽ thử lại */ }
  }
  return (
    <div className="bell-wrap" ref={box}>
      <button className="icon-btn bell-btn" aria-label={unread.length ? `Thông báo, ${unread.length} chưa đọc` : "Thông báo"} aria-expanded={open} onClick={toggle}>
        <Bell size={18} />
        {unread.length > 0 && <span className="bell-count">{unread.length > 9 ? "9+" : unread.length}</span>}
      </button>
      {open && (
        <div className="bell-pop" role="dialog" aria-label="Thông báo">
          <h2>Thông báo</h2>
          {!list.length ? (
            <p className="bell-empty">Bạn đã cập nhật hết. Thông báo mới sẽ hiện ở đây.</p>
          ) : (
            <ul>
              {list.map((n) => {
                const body = (
                  <>
                    <span>{n.noi_dung}</span>
                    <small>{fresh.includes(n.id) && <b className="bell-new">Mới</b>}{vnTime(n.thoi_gian)}</small>
                  </>
                );
                return (
                  <li key={n.id} className={fresh.includes(n.id) ? "is-new" : ""}>
                    {n.task_id ? <a href={`#/task/${n.task_id}`} onClick={() => setOpen(false)}>{body}</a> : <div>{body}</div>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}