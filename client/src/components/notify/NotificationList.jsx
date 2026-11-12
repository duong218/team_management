export default function NotificationList({ items = [] }) {
  return (
    <div>
      {items.slice(0, 50).map((x) => (
        <article className="card" key={x.id}>
          <p>{x.noi_dung}</p>
          <small>{x.thoi_gian}</small>
        </article>
      ))}
    </div>
  );
}
