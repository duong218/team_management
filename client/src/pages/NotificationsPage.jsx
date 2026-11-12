import { useNotifications } from "../hooks";
import { ErrorBox, Skeleton, EmptyState } from "../components/common";
import { useState } from "react";
import * as api from "../api/notifications";
export default function NotificationsPage({ userId }) {
  const q = useNotifications(userId);
  const [error, setError] = useState("");
  if (q.loading) return <Skeleton />;
  if (q.error) return <ErrorBox message={q.error} onRetry={q.reload} />;
  return (
    <section>
      <h1>Thông báo</h1>
      {!q.data?.length ? (
        <EmptyState title="Bạn đã cập nhật">
          Thông báo mới sẽ xuất hiện ở đây.
        </EmptyState>
      ) : (
        q.data.map((n) => (
          <article className="card" key={n.id}>
            <p>{n.noi_dung}</p>
            {!n.da_doc && <button onClick={async () => { setError(""); try { await api.markRead(n.id); await q.reload(); } catch (e) { setError(e.message); } }}>Đánh dấu đã đọc</button>}
          </article>
        ))
      )}
      {error && <ErrorBox message={error} onRetry={q.reload} />}
    </section>
  );
}
