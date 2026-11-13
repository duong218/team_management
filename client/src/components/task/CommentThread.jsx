import { useEffect, useRef } from "react";
import Avatar from "../common/Avatar";
import { vnTime } from "../../lib/format";
export default function CommentThread({ comments = [], meId, legacy }) {
  const box = useRef(null);
  useEffect(() => { const el = box.current; if (el) el.scrollTop = el.scrollHeight; }, [comments.length]);
  if (!comments.length && !legacy) return <p className="td-empty">Chưa có bình luận nào. Hãy là người đầu tiên.</p>;
  return (
    <div className="cm-thread" ref={box}>
      {legacy && <p className="cm-legacy"><b>Bình luận cũ (không rõ người gửi)</b>{legacy}</p>}
      {comments.map((c) => {
        const mine = c.user_id === meId;
        return (
          <div key={c.id} className={`cm ${mine ? "mine" : ""}`}>
            <Avatar name={c.ho_ten || "?"} src={c.anh_dai_dien} />
            <div className="cm-body">
              <div className="cm-who"><strong>{c.ho_ten || "Thành viên"}</strong><time>{vnTime(c.tao_luc)}</time></div>
              <p className="cm-bubble">{c.noi_dung}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
