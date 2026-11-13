import { useReport } from "../hooks";
import { ErrorBox, Skeleton, EmptyState } from "../components/common";
import { downloadCsv } from "../lib/csv";
import { largestRemainder, vnDue } from "../lib/format";
export default function ReportPage({ projectId }) {
  const q = useReport(projectId);
  if (q.loading) return <Skeleton />;
  if (q.error) return <ErrorBox message={q.error} onRetry={q.reload} />;
  if (!q.data) return <EmptyState title="Chưa có báo cáo" />;
  const members = q.data.members || [], tasks = q.data.tasks || [];
  const rows = [
    ["Thành viên", "Vai trò", "Trạng thái", "Điểm"],
    ...members.map((m) => [m.ho_ten, m.vai_tro, m.trang_thai, m.diem?.diem ?? ""]),
  ];
  return <section><h1>Báo cáo · {q.data.project?.ten}</h1>
    <button onClick={() => downloadCsv("bao-cao-thanh-vien.csv", rows)}>Xuất CSV thành viên</button>
    {!members.length && !tasks.length ? <EmptyState title="Chưa có dữ liệu báo cáo" /> : <>
      <h2>Thành viên ({members.length})</h2>
      {members.map((m) => <article className="card" key={m.member_id}><strong>{m.ho_ten}</strong><p>{m.vai_tro} · {m.trang_thai} · Điểm {m.diem?.diem ?? "Chưa có"}</p></article>)}
      <h2>Task ({tasks.length})</h2>
      {tasks.map((t) => { const contribution = largestRemainder(Object.entries((t.checklist || []).filter((c) => c.da_xong && c.nguoi_hoan_thanh).reduce((acc, c) => { acc[c.nguoi_hoan_thanh] = (acc[c.nguoi_hoan_thanh] || 0) + Number(c.trong_so); return acc; }, {})).map(([id, value]) => ({ id, value }))); return <article className="card" key={t.task_id}><strong>{t.tieu_de || "Task giao cho bạn"}</strong><p>{t.trang_thai} · {Number(t.tien_do || 0).toFixed(2)}% · Hạn {vnDue(t.han_chot)}</p><p>{t.assignees?.map((a) => a.ho_ten).filter(Boolean).join(", ")}</p>{contribution.length > 0 ? contribution.map((c) => <p key={c.id}>{t.assignees?.find((a) => a.member_id === c.id)?.ho_ten || "Thành viên"}: {c.percent}%</p>) : <small>Chưa có đóng góp được ghi nhận.</small>}</article>; })}
    </>}
    <p className="hint">Điểm là thước đo tương đối theo công thức của nhóm; link minh chứng không được hệ thống xác thực nội dung.</p>
  </section>;
}