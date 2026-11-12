export default function LinkList({ links = [] }) {
  return (
    <ul>
      {links.map((l) => (
        <li key={l.id}>
          <a href={l.url} target="_blank" rel="noopener noreferrer">
            {l.ghi_chu || new URL(l.url).hostname}
          </a>
        </li>
      ))}
    </ul>
  );
}
