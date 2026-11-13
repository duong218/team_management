import { useId } from "react";
// Logo Ocean and Gem: khối tím → xanh biển, hai làn sóng trắng và một viên ngọc nhỏ.
export default function Logo({ className = "", size = 40 }) {
  const id = useId();
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="Ocean and Gem">
      <defs>
        <linearGradient id={id} x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="15" fill={`url(#${id})`} />
      <ellipse cx="17" cy="9" rx="13" ry="6" fill="#fff" opacity="0.22" />
      <circle cx="32" cy="15" r="4" fill="#fff" />
      <path d="M9 26q4.8-6 9.6 0t9.6 0 9.6 0" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M9 35q4.8-6 9.6 0t9.6 0 9.6 0" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="3.6" strokeLinecap="round" />
    </svg>
  );
}
