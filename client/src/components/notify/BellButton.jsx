import { Bell } from "lucide-react";
export default function BellButton({ unread = 0, onClick }) {
  return (
    <button aria-label={`Thông báo, ${unread} chưa đọc`} onClick={onClick}>
      <Bell size={18} /> {unread > 0 && <span>{unread}</span>}
    </button>
  );
}
