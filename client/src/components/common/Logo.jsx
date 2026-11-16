import { useId } from "react";
// Logo Ocean and Gem: viên ngọc tím ngập một nửa trong nước, đường sóng trắng chia đôi mặt cắt.
const FACETS = [
  ["M3 19 13 7 15 19Z", "#8f7dff"],
  ["M13 7H35L33 19H15Z", "#c1b8ff"],
  ["M35 7 45 19H33Z", "#6e5cf2"],
  ["M3 19H15L24 43Z", "#5a46dc"],
  ["M15 19H33L24 43Z", "#7a68ff"],
  ["M33 19H45L24 43Z", "#4733b8"],
];
const WAVE = "M0 29C6 25 10 25 15 29S24 33 29 29 40 25 48 29";
export default function Logo({ className = "", size = 40 }) {
  const id = useId();
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="Ocean and Gem">
      <defs>
        <clipPath id={id}>
          <path d={FACETS.map(([d]) => d).join("")} />
        </clipPath>
      </defs>
      <g strokeLinejoin="round" strokeWidth="2">
        {FACETS.map(([d, c]) => <path key={d} d={d} fill={c} stroke={c} />)}
      </g>
      <g clipPath={`url(#${id})`}>
        <path d={`${WAVE}V48H0Z`} fill="#22d3ee" fillOpacity="0.6" />
        <path d={WAVE} fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M13 7 15 19M35 7 33 19M15 19H33M15 19 24 43M33 19 24 43" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="0.9" strokeLinecap="round" />
      </g>
    </svg>
  );
}
