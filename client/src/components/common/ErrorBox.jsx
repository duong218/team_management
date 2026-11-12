export default function ErrorBox({ message, onRetry }) {
  return (
    <div role="alert" className="error">
      <span>{message}</span>
      {onRetry && <button onClick={onRetry}>Thử lại</button>}
    </div>
  );
}
