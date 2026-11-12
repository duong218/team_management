import { largestRemainder } from "../../lib/format";
export default function ContributionBar({ members = [] }) {
  const parts = largestRemainder(
    members.map((x) => ({ name: x.name, value: x.value })),
  );
  return (
    <ul>
      {parts.map((x, i) => (
        <li key={i}>
          {x.name}: {x.percent === null ? "Chưa có đóng góp" : `${x.percent}%`}
        </li>
      ))}
    </ul>
  );
}
