import { useMemo, useState } from 'react'
import { useChecklist, useProject, useTask, useAsync } from '../hooks'
import * as checklistApi from '../api/checklist'
import * as linkApi from '../api/links'
import * as taskApi from '../api/tasks'
import * as transferApi from '../api/transfers'
import * as memberApi from '../api/members'
import * as voteApi from '../api/votes'
import * as reportApi from '../api/reports'
import { ErrorBox, Skeleton, EmptyState } from '../components/common'
import ChecklistRow from '../components/task/ChecklistRow'
import LinkForm from '../components/task/LinkForm'
import LinkList from '../components/task/LinkList'
import TransferTimeline from '../components/task/TransferTimeline'
import ContributionBar from '../components/task/ContributionBar'
import { vnTime, vnDue } from '../lib/format'
export default function TaskDetailPage({ taskId }) {
  const task = useTask(taskId), checklist = useChecklist(taskId)
  const projectId = task.data?.project_id
  const project = useProject(projectId)
  const me = useAsync(() => projectId ? memberApi.getMyMember(projectId) : Promise.resolve(null), [projectId])
  const contributions = useAsync(() => task.data?.mo_ta !== undefined ? checklistApi.listTaskContributions(taskId) : Promise.resolve([]), [taskId, task.data?.mo_ta])
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [openLink, setOpenLink] = useState(''), [reason, setReason] = useState(''), [comment, setComment] = useState(''), [commentError, setCommentError] = useState('')
  const items = checklist.data || task.data?.checklist || []
  const links = useMemo(() => task.data?.links || [], [task.data?.links])
  const manager = ['truong_nhom', 'pho_nhom'].includes(project.data?.vaiTro)
  const isAssignee = task.data?.assignees?.some((a) => a.member_id === me.data?.id && a.trang_thai === 'dang_lam')
  const ownIds = useMemo(() => new Set(links.filter((l) => l.nguoi_them === me.data?.id && l.trang_thai_link === 'hop_le').map((l) => l.muc_id)), [links, me.data?.id])
  const allDone = items.length > 0 && items.filter((x) => x.trang_thai_muc === 'da_duyet').every((x) => x.da_xong)
  async function perform(fn) { setBusy(true); setError(''); try { await fn(); await Promise.all([task.reload(), checklist.reload(), contributions.reload()]) } catch (e) { setError(e.message) } finally { setBusy(false) } }
  if (task.loading || checklist.loading || contributions.loading || (projectId && project.loading) || (projectId && me.loading)) return <Skeleton />
  const loadError = task.error || checklist.error || contributions.error || project.error || me.error
  if (loadError) return <ErrorBox message={loadError} onRetry={() => Promise.all([task.reload(), checklist.reload(), contributions.reload(), project.reload(), me.reload()])} />
  if (!task.data) return <EmptyState title="Không tìm thấy task">Bạn có thể đã mất quyền xem task này.</EmptyState>
  const t = task.data
  const contributes = (contributions.data || []).map((x) => ({ name: t.assignees?.find((a) => a.member_id === x.member_id)?.member?.ho_ten || 'Thành viên', value: Number(x.phan_tram) }))
  return <article className="card task-detail"><button onClick={() => history.back()}>← Quay lại</button><h1>{t.tieu_de || 'Task giao cho bạn'}</h1><p>{t.mo_ta}</p><p>Trạng thái: {t.trang_thai} · Tiến độ: {Number(t.tien_do || 0).toFixed(2)}%</p><p>Hạn chót: {vnDue(t.han_chot)} · cập nhật {vnTime(t.cap_nhat_luc)}</p>
    {error && <ErrorBox message={error} onRetry={() => Promise.all([task.reload(), checklist.reload()])} />}
    {t.trang_thai === 'da_huy' && <section className="card"><h2>Task đã hủy</h2><p>{t.ly_do_huy}</p>{manager && <ReasonAction reason={reason} setReason={setReason} busy={busy} label="Khôi phục task" onConfirm={() => perform(() => taskApi.restoreTask(t.id, reason))} />}</section>}
    {t.trang_thai === 'hoan_thanh' && manager && <ReasonAction reason={reason} setReason={setReason} busy={busy} label="Mở lại task" onConfirm={() => perform(() => taskApi.reopenTask(t.id, reason))} />}
    <section><h2>Danh sách việc nhỏ</h2>{items.length === 0 ? <EmptyState title="Checklist chưa khả dụng">Nếu bạn chỉ thấy phần tóm tắt, task chưa được giao cho bạn.</EmptyState> : items.map((item) => { const itemLinks = links.filter((l) => l.muc_id === item.id); return <div className="checklist-item" key={item.id}><ChecklistRow item={item} hasOwnLink={ownIds.has(item.id)} canAddLink={isAssignee && ['can_lam', 'dang_lam'].includes(t.trang_thai)} onToggle={() => perform(() => checklistApi.toggleChecklistItem(item.id, !item.da_xong))} onAddLink={() => setOpenLink(openLink === item.id ? '' : item.id)} /><LinkList links={itemLinks.filter((l) => l.trang_thai_link === 'hop_le')} />{isAssignee && openLink === item.id && ['can_lam', 'dang_lam'].includes(t.trang_thai) && <LinkForm onSubmit={({ url, ghi_chu }) => perform(async () => { await linkApi.addLink(item.id, url, ghi_chu); setOpenLink('') })} />}{manager && t.trang_thai === 'cho_duyet' && itemLinks.filter((l) => l.trang_thai_link === 'hop_le').map((l) => <button key={l.id} disabled={busy} onClick={() => { const why = window.prompt('Lý do từ chối link (ít nhất 10 ký tự)'); if (why?.trim().length >= 10) perform(() => linkApi.rejectLink(l.id, why)) }}>Từ chối minh chứng</button>)}</div> })}</section>
    {manager && !['cho_duyet', 'hoan_thanh', 'da_huy'].includes(t.trang_thai) && <details><summary>Thêm mục checklist</summary><AddItem onAdd={(content) => perform(() => checklistApi.addChecklistItem(t.id, content))} /></details>}
    <section className="card"><h2>Người được giao</h2>{t.assignees?.map((a) => <p key={a.member_id}>{a.member?.ho_ten || 'Thành viên'} · {a.vai_tro_trong_task === 'chinh' ? 'Chính' : 'Hỗ trợ'} · {a.member?.trang_thai === 'da_roi' ? 'Đã rời, cần chuyển tiếp' : a.trang_thai}</p>)}{manager && ['can_lam', 'dang_lam'].includes(t.trang_thai) && <><AssignControls task={t} projectId={projectId} onDone={() => Promise.all([task.reload(), checklist.reload()])} />{t.assignees?.filter((a) => a.vai_tro_trong_task === 'chinh' && (a.trang_thai === 'dang_lam' || a.trang_thai === 'da_go')).map((a) => <DirectTransfer key={a.member_id} task={t} from={a} projectId={projectId} busy={busy} onTransfer={({ member, type, reason, due }) => perform(() => transferApi.transferTask(t.id, a.member_id, member, type, reason, due))} />)}</>}</section>
    <section><h2>Đóng góp</h2><ContributionBar members={contributes} />{manager && ['can_lam', 'dang_lam'].includes(t.trang_thai) && <ContributionEditor taskId={t.id} rows={contributions.data || []} names={t.assignees || []} onSave={(allocations, why) => perform(() => reportApi.adjustContribution(t.id, allocations, why))} />}</section>
    {(manager || isAssignee) && <section><h2>Lịch sử người chính</h2><TransferTimeline items={t.history || []} /></section>}
    <section><h2>Bình luận</h2><p>{t.binh_luan}</p><form onSubmit={async (e) => { e.preventDefault(); setCommentError(''); try { await taskApi.addComment(t.id, comment); setComment(''); await task.reload() } catch (x) { setCommentError(x.message) } }}><label>Viết bình luận<textarea maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} /></label>{commentError && <ErrorBox message={commentError} />}<button disabled={!comment.trim()}>Gửi bình luận</button></form></section>
    <footer className="task-actions">{t.trang_thai === 'can_lam' && isAssignee && <button disabled={busy} onClick={() => perform(() => taskApi.startTask(t.id))}>Bắt đầu</button>}{t.trang_thai === 'dang_lam' && <>{isAssignee && <button disabled={busy || !allDone} onClick={() => perform(() => taskApi.submitTask(t.id))}>Gửi duyệt</button>}{isAssignee && <ReasonAction reason={reason} setReason={setReason} busy={busy} label="Xin chuyển giao" hint="Phần đã tích kèm link vẫn tính cho bạn." onConfirm={() => perform(() => transferApi.requestTransfer(t.id, reason))} />}</>}{t.trang_thai === 'cho_duyet' && manager && <><button disabled={busy} onClick={() => perform(() => taskApi.approveTask(t.id))}>Duyệt hoàn thành</button><ReasonAction reason={reason} setReason={setReason} busy={busy} label="Trả lại" onConfirm={() => perform(() => taskApi.returnTask(t.id, reason))} /></>}{manager && !['da_huy'].includes(t.trang_thai) && <ReasonAction reason={reason} setReason={setReason} busy={busy} label="Hủy task" onConfirm={() => perform(() => taskApi.cancelTask(t.id, reason))} />}{project.data.project?.bat_binh_chon && t.trang_thai === 'can_lam' && !t.assignees?.some((a) => a.trang_thai === 'dang_lam') && <button onClick={() => perform(() => voteApi.castVote(t.id))}>Bình chọn nhận task</button>}</footer>
    <p className="hint">Gắn link không chứng minh nội dung đúng. Hãy cấp quyền xem link cho nhóm trưởng/phó trước khi gửi duyệt.</p>
  </article>
}
function ReasonAction({ reason, setReason, busy, label, hint, onConfirm }) { return <div className="reason-action"><label>{label} · lý do<textarea maxLength={1000} minLength={10} value={reason} onChange={(e) => setReason(e.target.value)} /></label>{hint && <small>{hint}</small>}<button disabled={busy || reason.trim().length < 10} onClick={onConfirm}>{label}</button></div> }
function AddItem({ onAdd }) { const [value, setValue] = useState(''); return <form onSubmit={(e) => { e.preventDefault(); onAdd(value); setValue('') }}><input maxLength={500} value={value} onChange={(e) => setValue(e.target.value)} required /><button>Thêm</button></form> }
function AssignControls({ task, projectId, onDone }) {
  const team = useAsync(() => memberApi.listMembers(projectId), [projectId]), [member, setMember] = useState(''), [role, setRole] = useState('chinh'), [error, setError] = useState('')
  if (team.loading) return <Skeleton />
  if (team.error) return <ErrorBox message={team.error} onRetry={team.reload} />
  const hasPrincipal = task.assignees?.some((a) => a.vai_tro_trong_task === 'chinh' && a.trang_thai === 'dang_lam')
  const roles = task.trang_thai === 'dang_lam' || hasPrincipal ? ['ho_tro'] : ['chinh', 'ho_tro']
  const chosenRole = roles.includes(role) ? role : roles[0]
  const available = team.data.filter((m) => m.trang_thai === 'dang_tham_gia' && !task.assignees?.some((a) => a.member_id === m.member_id && a.trang_thai === 'dang_lam'))
  return <div><label>Thêm người tham gia<select value={member} onChange={(e) => setMember(e.target.value)}><option value="">Chọn thành viên</option>{available.map((m) => <option key={m.member_id} value={m.member_id}>{m.ho_ten}</option>)}</select></label><select value={chosenRole} onChange={(e) => setRole(e.target.value)}>{roles.map((x) => <option key={x} value={x}>{x === 'chinh' ? 'Chính' : 'Hỗ trợ'}</option>)}</select>{error && <ErrorBox message={error} />}<button disabled={!member} onClick={async () => { setError(''); try { await taskApi.assignTask(task.id, member, chosenRole); await onDone() } catch (e) { setError(e.message) } }}>Giao task</button></div>
}
function DirectTransfer({ from, projectId, busy, onTransfer }) {
  const team = useAsync(() => memberApi.listMembers(projectId), [projectId])
  const [member, setMember] = useState(''), [type, setType] = useState(''), [reason, setReason] = useState(''), [due, setDue] = useState('')
  if (team.loading) return <Skeleton />
  if (team.error) return <ErrorBox message={team.error} onRetry={team.reload} />
  const choices = team.data.filter((m) => m.trang_thai === 'dang_tham_gia' && m.member_id !== from.member_id)
  return <form className="card" onSubmit={(e) => { e.preventDefault(); onTransfer({ member, type, reason, due }) }}><h3>Chuyển người chính: {from.member?.ho_ten || 'thành viên đã rời'}</h3><label>Người tiếp nhận<select required value={member} onChange={(e) => setMember(e.target.value)}><option value="">Chọn thành viên</option>{choices.map((m) => <option key={m.member_id} value={m.member_id}>{m.ho_ten}</option>)}</select></label><label>Loại chuyển<select required value={type} onChange={(e) => setType(e.target.value)}><option value="">Chọn loại</option><option value="khach_quan">Lý do khách quan</option><option value="chua_kip">Chưa kịp tiến độ</option></select></label><label>Lý do (ít nhất 10 ký tự)<textarea required minLength={10} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} /></label><label>Hạn mới (để trống thì giữ hạn hiện tại)<input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} /></label><button disabled={busy || !member || !type || reason.trim().length < 10}>Chuyển giao</button></form>
}

function ContributionEditor({ taskId, rows, names, onSave }) {
  const [open, setOpen] = useState(false), [values, setValues] = useState({}), [reason, setReason] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const contributors = [...new Set(rows.map((row) => row.member_id))]
  if (!contributors.length) return null
  const total = contributors.reduce((sum, id) => sum + Number(values[id] ?? rows.find((row) => row.member_id === id)?.phan_tram ?? 0), 0)
  return <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)}><summary>Điều chỉnh tỷ lệ đóng góp</summary><p>Chỉ áp dụng khi có mục checklist đã được duyệt; tổng phải bằng 100%.</p>{contributors.map((id) => <label key={`${taskId}-${id}`}>{names.find((member) => member.member_id === id)?.member?.ho_ten || 'Thành viên'}<input type="number" min="0" max="100" step="0.01" value={values[id] ?? rows.find((row) => row.member_id === id)?.phan_tram ?? 0} onChange={(event) => setValues((old) => ({ ...old, [id]: event.target.value }))} /></label>)}<p>Tổng: {total.toFixed(2)}%</p><label>Lý do<textarea minLength={10} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} /></label>{error && <ErrorBox message={error} />}<button disabled={busy || Math.abs(total - 100) > 0.0001 || reason.trim().length < 10} onClick={async () => { setBusy(true); setError(''); try { await onSave(contributors.map((member_id) => ({ member_id, phan_tram: Number(values[member_id] ?? rows.find((row) => row.member_id === member_id)?.phan_tram ?? 0) })), reason); setReason('') } catch (e) { setError(e.message) } finally { setBusy(false) } }}>Lưu tỷ lệ</button></details>
}