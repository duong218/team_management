import { Link2 } from "lucide-react";
const host = (u) => { try { return new URL(u).hostname; } catch { return u; } };
export default function LinkList({ links = [] }) {
  if (!links.length) return null;
  return (
    <ul className="td-links">
      {links.map((l) => (
        <li key={l.id}>
          <a href={l.url} target="_blank" rel="noopener noreferrer"><Link2 size={14} />{l.ghi_chu || host(l.url)}</a>
        </li>
      ))}
    </ul>
  );
}
