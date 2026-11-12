import { vnTime } from "../../lib/format";
export default function TransferTimeline({ items = [] }) {
  return (
    <ol>
      {items.map((x) => (
        <li key={x.id}>
          {vnTime(x.thoi_gian)} · {x.tu_member} → {x.den_member} ·{" "}
          {x.tien_do_luc_chuyen}%
        </li>
      ))}
    </ol>
  );
}
