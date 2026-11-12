export default function WaitingRoom({
  requests = [],
  onApprove,
  onReplace,
  onReject,
}) {
  return (
    <section className="card">
      <h2>Phòng chờ ({requests.length})</h2>
      {requests.map((r) => (
        <article key={r.id}>
          <strong>{r.ho_ten}</strong>
          <p>
            {r.email} · {r.don_vi} · {r.ma_dinh_danh}
          </p>
          <button className="primary" onClick={() => onApprove?.(r)}>Cho vào</button>
          <button onClick={() => onReplace?.(r)}>Thay thế người cũ</button>
          <button className="danger" onClick={() => onReject?.(r)}>Từ chối</button>
        </article>
      ))}
    </section>
  );
}
