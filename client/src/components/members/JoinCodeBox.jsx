export default function JoinCodeBox({ code, onGet, onRotate, onDisable }) {
  return (
    <section className="card">
      <h2>Mã tham gia</h2>
      {code ? <code>{code}</code> : <p>Mã đang tắt hoặc chưa tải.</p>}
      <div className="actions">
        <button className="primary" onClick={onGet}>Xem mã</button>
        <button onClick={onRotate}>Đổi mã</button>
        <button className="danger" onClick={onDisable}>Tắt mã</button>
      </div>
    </section>
  );
}
