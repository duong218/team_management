import { useState } from "react";
import "../../styles/report-scene.css";

/* Cảnh nền banner báo cáo: một thành viên cầm báo cáo đi tới bàn trưởng nhóm, đưa xong trưởng nhóm gật đầu và hiện "Duyệt!", rồi bạn quay về. Mỗi vòng 12 giây đổi sang thành viên kế tiếp. Đầu là ảnh đại diện (không có ảnh thì chữ cái đầu). */
const COLORS = ["#6d28d9", "#0f766e", "#b45309", "#be185d", "#1d4ed8", "#15803d"];
function Head({ m, r, clip }) {
  const [bad, setBad] = useState(false);
  const name = m?.ho_ten || "";
  const initials = name.trim().split(/\s+/).slice(-2).map((w) => w[0]).join("").toUpperCase();
  const bg = m ? COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length] : "#f6c9a3";
  return (
    <g>
      <circle r={r} fill={bg} />
      {m?.anh_dai_dien && !bad ? <image href={m.anh_dai_dien} x={-r} y={-r} width={2 * r} height={2 * r} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clip})`} referrerPolicy="no-referrer" onError={() => setBad(true)} /> : <text textAnchor="middle" dy=".35em" fontSize={r * 0.95} fontWeight="800" fill="#fff">{initials}</text>}
      <circle r={r} fill="none" stroke="#fff" strokeWidth="2" />
    </g>
  );
}
const Paper = () => (
  <>
    <rect x="-8" y="-11" width="16" height="22" rx="2" fill="#fff" stroke="#c4b5fd" strokeWidth="1" />
    <rect x="-5" y="-7" width="10" height="2.6" rx="1" fill="#7c3aed" />
    <path d="M-5 -1h10M-5 3h10M-5 7h6" stroke="#cbd5e1" strokeWidth="1.4" strokeLinecap="round" />
  </>
);

export default function ReportScene({ members = [] }) {
  const [turn, setTurn] = useState(0);
  const active = members.filter((m) => m.trang_thai === "dang_tham_gia");
  const boss = active.find((m) => m.vai_tro === "truong_nhom") || active[0];
  const walkers = active.filter((m) => m !== boss);
  const walker = walkers.length ? walkers[turn % walkers.length] : null;
  return (
    <svg className="rh-scene" viewBox="0 0 520 150" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" focusable="false">
      <defs><clipPath id="rh-cb"><circle r="16" /></clipPath><clipPath id="rh-cw"><circle r="13.5" /></clipPath></defs>
      <ellipse cx="400" cy="143" rx="92" ry="4.5" fill="#4c1d95" opacity=".12" />
      {/* chậu cây */}
      <g transform="translate(497 141)">
        <path d="M-12 0 L-9 -20 H9 L12 0Z" fill="#f59e0b" />
        <g className="rh-leaf"><circle cx="0" cy="-34" r="11" fill="#22c55e" /><circle cx="-10" cy="-27" r="8" fill="#16a34a" /><circle cx="10" cy="-28" r="8.5" fill="#4ade80" /></g>
      </g>
      {/* sếp */}
      <g>
        <rect x="374" y="56" width="52" height="62" rx="14" fill="#6b7280" />
        <rect x="380" y="70" width="40" height="36" rx="10" fill="#3b3f73" />
        <path d="M393 70 L400 86 L407 70Z" fill="#fff" />
        <path d="M398 75 h4 l2 13 l-4 4 l-4 -4z" fill="#e11d48" />
        <g className="rh-nod"><g transform="translate(400 54)"><Head key={boss?.member_id} m={boss} r={16} clip="rh-cb" /></g></g>
      </g>
      {/* bàn */}
      <rect x="322" y="98" width="150" height="9" rx="4.5" fill="#e0b07a" />
      <rect x="329" y="106" width="136" height="35" rx="6" fill="#c98f5a" />
      <rect x="338" y="113" width="52" height="20" rx="4" fill="#b87d49" /><rect x="402" y="113" width="52" height="20" rx="4" fill="#b87d49" />
      <g className="rh-paper-desk" transform="translate(346 96)"><rect x="-11" y="-5" width="22" height="5" rx="1.5" fill="#fff" stroke="#c4b5fd" strokeWidth="1" /></g>
      {/* bong bóng "Duyệt!" */}
      <g transform="translate(400 36)">
        <g className="rh-bubble">
          <rect x="-42" y="-31" width="84" height="27" rx="13.5" fill="#fff" />
          <path d="M-5 -5 L0 3 L5 -5Z" fill="#fff" />
          <circle cx="-26" cy="-17.5" r="8" fill="#22c55e" />
          <path d="M-30 -17.5 l3 3.4 l6 -6.6" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <text x="-14" y="-12.5" fontSize="13" fontWeight="800" fill="#14532d">Duyệt!</text>
        </g>
      </g>
      {/* bạn đi nộp báo cáo */}
      <g transform="translate(60 141)">
        <g className="rh-walker" onAnimationIteration={(e) => e.animationName === "rh-walk" && setTurn((n) => n + 1)}>
          <ellipse cx="0" cy="1" rx="16" ry="3.2" fill="#4c1d95" opacity=".14" />
          <g className="rh-bob">
            <g className="rh-limb rh-arm-b"><rect x="-4" y="-66" width="8" height="26" rx="4" fill="#5b21b6" /></g>
            <g className="rh-limb rh-leg-b"><rect x="-7" y="-36" width="9" height="34" rx="4.5" fill="#475569" /><ellipse cx="0" cy="0" rx="8" ry="3.4" fill="#1e293b" /></g>
            <g className="rh-limb rh-leg-a"><rect x="-4" y="-36" width="9" height="34" rx="4.5" fill="#334155" /><ellipse cx="3" cy="0" rx="8" ry="3.4" fill="#1e293b" /></g>
            <rect x="-13" y="-70" width="26" height="38" rx="10" fill="#7c3aed" />
            <path d="M-5 -70 L0 -62 L5 -70Z" fill="#fff" />
            <g className="rh-limb rh-arm-f"><rect x="-4" y="-64" width="8" height="26" rx="4" fill="#6d28d9" /><circle cx="0" cy="-37" r="4.2" fill="#f6c9a3" /></g>
            <g className="rh-paper-hand" transform="translate(31 -63) rotate(-6)"><Paper /></g>
            <g className="rh-face"><g transform="translate(0 -82)"><Head key={walker?.member_id} m={walker} r={13.5} clip="rh-cw" /></g></g>
          </g>
        </g>
      </g>
    </svg>
  );
}
