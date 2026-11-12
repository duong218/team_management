export default function ChecklistRow({
  item,
  hasOwnLink,
  canAddLink,
  onToggle,
  onAddLink,
}) {
  return (
    <div className="check-row">
      <input
        type="checkbox"
        checked={!!item.da_xong}
        disabled={!hasOwnLink}
        onChange={onToggle}
      />
      <span>{item.noi_dung}</span>
      {canAddLink && !hasOwnLink && (
        <button onClick={onAddLink}>Cần gắn minh chứng trước</button>
      )}
    </div>
  );
}
