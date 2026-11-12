export default function Skeleton({ label = "Đang tải..." }) {
  return (
    <div className="skeleton" aria-live="polite">
      {label}
    </div>
  );
}
