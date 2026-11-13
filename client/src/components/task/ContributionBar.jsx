import { largestRemainder } from "../../lib/format";
const COLORS = ["#7c3aed", "#0ea5e9", "#22c55e", "#f97316", "#ec4899"];
export default function ContributionBar({ members = [] }) {
  const parts = largestRemainder(members.map((x) => ({ name: x.name, value: x.value })));
  return (
    <ul className="td-contrib">
      {parts.map((x, i) => (
        <li key={i}>
          <span>{x.name}</span>
          <b>{x.percent === null ? "Chưa có đóng góp" : `${x.percent}%`}</b>
          <div className="progress"><span style={{ width: `${x.percent || 0}%`, background: COLORS[i % COLORS.length] }} /></div>
        </li>
      ))}
    </ul>
  );
}
