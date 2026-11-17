import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { BREAK, LUNCH, greetLine, inLunch, pick } from "../../lib/buddyLines";
import tuxedo from "../../assets/buddy/tuxedo.svg";
import cam from "../../assets/buddy/cam.svg";
import kiss from "../../assets/buddy/kiss.svg";
import "../../styles/buddy.css";

// Bé mèo + bong bóng thoại ở đáy sidebar. Chào 1 lần mỗi phiên; làm liên tục 30 phút thì nhắc nghỉ (im quá 5 phút = đã nghỉ, tính lại).
// Nhắc nghỉ trưa thay cho nhắc nghỉ thường nếu trùng giờ 10h30–13h và hôm nay chưa nhắc. Mỗi lần hiện đổi hình, không lặp hình vừa rồi.
const CATS = [tuxedo, cam, kiss];
const WORK_MS = 30 * 60e3, IDLE_MS = 5 * 60e3, SHOW_MS = 8e3, TICK = 15e3;
const GREET_KEY = "buddy-greeted", LUNCH_KEY = "buddy-lunch-day";
const nextCat = (prev) => {
  let i;
  do i = Math.floor(Math.random() * CATS.length); while (i === prev);
  return i;
};
const greeted = () => { try { return sessionStorage.getItem(GREET_KEY) === "1"; } catch { return false; } };

export default function SidebarBuddy() {
  const [say, setSay] = useState(() => (greeted() ? null : { text: greetLine(), i: nextCat() }));
  const [open, setOpen] = useState(!!say);
  const [hover, setHover] = useState(false); // rê chuột vào thì giữ bong bóng, không tự tắt
  const close = () => { setOpen(false); setHover(false); };
  useEffect(() => { try { sessionStorage.setItem(GREET_KEY, "1"); } catch { /* bỏ qua */ } }, []);
  useEffect(() => {
    let seen = Date.now(), worked = 0;
    const mark = () => { seen = Date.now(); };
    const events = ["pointerdown", "keydown", "wheel"];
    events.forEach((e) => addEventListener(e, mark, { passive: true }));
    const id = setInterval(() => {
      worked = Date.now() - seen < IDLE_MS ? worked + TICK : 0;
      if (worked < WORK_MS) return;
      worked = 0;
      const d = new Date(), day = d.toDateString();
      let lunch = false;
      try { lunch = inLunch(d) && localStorage.getItem(LUNCH_KEY) !== day; if (lunch) localStorage.setItem(LUNCH_KEY, day); } catch { /* bỏ qua */ }
      setSay((s) => ({ text: pick(lunch ? LUNCH : BREAK), i: nextCat(s?.i) }));
      setHover(false);
      setOpen(true);
    }, TICK);
    return () => { clearInterval(id); events.forEach((e) => removeEventListener(e, mark)); };
  }, []);
  useEffect(() => {
    if (!open || hover) return;
    const t = setTimeout(() => setOpen(false), SHOW_MS);
    return () => clearTimeout(t);
  }, [open, hover, say]);
  if (!open) return null;
  return (
    <div className="buddy" role="status" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="buddy-bubble">
        <span>{say.text}</span>
        <button type="button" className="buddy-x" aria-label="Đóng" onClick={close}><X size={12} /></button>
      </div>
      <img className="buddy-cat" src={CATS[say.i]} alt="" />
    </div>
  );
}
