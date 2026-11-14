export default function Skeleton({ label = "Đang tải..." }) {
  return (
    <div className="skeleton" role="status" aria-live="polite">
      <img src="/cat-mark-loading.svg" alt="" />
      <span>{label}</span>
    </div>
  );
}
