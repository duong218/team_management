export default function EmptyState({ title = "Chưa có dữ liệu", children }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
