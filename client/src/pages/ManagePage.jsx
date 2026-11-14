import { useMemo, useState } from 'react'
import Select from "../components/common/Select"
import { useAsync, useJoinRequests, useProject } from '../hooks'
import * as memberApi from '../api/members'
import * as transferApi from '../api/transfers'
import * as projectApi from '../api/projects'
import * as voteApi from '../api/votes'
import * as reportApi from '../api/reports'
import { ROLES } from '../lib/constants'
import { ErrorBox, Skeleton, EmptyState } from '../components/common'
import { KickDialog, WaitingRoom, MemberRow, ProjectSettingsDialog, CloseProjectDialog, RemoveMemberDialog } from '../components/members'
import { Users, DoorOpen, ArrowRightLeft, TriangleAlert, ClipboardList, Pencil, Flag, RotateCcw, LayoutDashboard, Vote, Check, Lock } from 'lucide-react'
import '../styles/manage.css'
export default function ManagePage({ projectId, navigate }) {
  const project = useProject(projectId)
  const role = project.data?.vaiTro, manager = role === 'truong_nhom' || role === 'pho_nhom'
  const members = useAsync(() => manager ? memberApi.listMembers(projectId) : memberApi.listCurrentMembers(projectId), [projectId, manager])
  const waiting = useJoinRequests(projectId, manager)
  const transfers = useAsync(() => manager ? transferApi.transferQueue(projectId) : Promise.resolve([]), [projectId, manager])
  const [tab, setTab] = useState('members'), [editing, setEditing] = useState(false), [closing, setClosing] = useState(null), [joinCode, setJoinCode] = useState(undefined), [selectedKick, setSelectedKick] = useState(null), [selectedRemove, setSelectedRemove] = useState(null), [replaceFor, setReplaceFor] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const active = useMemo(() => members.data?.filter((m) => m.trang_thai === 'dang_tham_gia') || [], [members.data])
  const reload = async () => Promise.all([project.reload(), members.reload(), waiting.reload(), transfers.reload()])
  async function act(fn) { setBusy(true); setError(''); try { await fn(); await reload(); return true } catch (e) { setError(e.message); return false } finally { setBusy(false) } }
  async function loadCode(fn) { try { setJoinCode(await fn(projectId)) } catch (e) { setError(e.message) } }
  if (project.loading || members.loading || (manager && (waiting.loading || transfers.loading))) return <Skeleton />
  const err = project.error || members.error || (manager && waiting.error) || (manager && transfers.error)
  if (err) return <ErrorBox message={err} onRetry={reload} />
  const pr = project.data?.project || {}, archived = pr.trang_thai === 'luu_tru', nTransfer = transfers.data?.length || 0
  // Gọi lần đầu (confirm=false): sạch cảnh báo thì kết thúc luôn, còn cảnh báo thì server trả danh sách để người dùng xác nhận bước 2.
  const closeProject = async (confirmed) => {
    let warn = null
    const ok = await act(async () => { const r = await reportApi.closeProject(projectId, confirmed); if (r?.can_xac_nhan) warn = r.canh_bao })
    setClosing(ok && warn ? { warnings: warn } : null)
  }
  return <section><h1>{manager ? 'Quản lý công việc' : 'Thành viên trong nhóm'}</h1>{manager && <p className="eyebrow">Trên điện thoại, thao tác quản lý thuận tiện hơn khi dùng máy tính.</p>}{error && <ErrorBox message={error} onRetry={() => setError('')} />}
    {manager && <div className="mg-stats"><div className="mg-stat mg-stat-teal"><span className="mg-ico mg-ico-teal"><Users size={22} aria-hidden="true" /></span><div><b>{active.length}</b><span>Thành viên</span></div></div><div className="mg-stat mg-stat-amber"><span className="mg-ico mg-ico-amber"><DoorOpen size={22} aria-hidden="true" /></span><div><b>{waiting.data?.length || 0}</b><span>Đang chờ duyệt</span></div></div><div className="mg-stat mg-stat-violet"><span className="mg-ico mg-ico-violet"><ArrowRightLeft size={22} aria-hidden="true" /></span><div><b>{transfers.data?.length || 0}</b><span>Yêu cầu chuyển giao</span></div></div><div className="mg-stat mg-stat-rose"><span className="mg-ico" style={{ background: '#fecdd3', color: '#881337' }}><TriangleAlert size={22} aria-hidden="true" /></span><div><b>{active.filter((m) => m.chua_nhan_viec).length}</b><span>Chưa nhận việc</span></div></div></div>}
    {!manager ? <section className="card mg-card"><h2><span className="mg-ico mg-ico-teal"><Users size={18} aria-hidden="true" /></span>Danh sách thành viên <span className="mg-count">{active.length}</span></h2>{active.length ? active.map((m) => <MemberRow key={m.member_id} member={m} readOnly />) : <EmptyState title="Chưa có thành viên" />}</section> : <>
      <div className="mg-tabs" role="tablist" aria-label="Khu vực quản lý">
        <button role="tab" id="tab-members" aria-selected={tab === 'members'} aria-controls="panel-members" onClick={() => setTab('members')}><Users size={18} aria-hidden="true" />Thành viên<span className="mg-count">{active.length}</span></button>
        <button role="tab" id="tab-work" aria-selected={tab === 'work'} aria-controls="panel-work" onClick={() => setTab('work')}><ClipboardList size={18} aria-hidden="true" />Công việc{nTransfer > 0 && <span className="mg-count mg-count-warn">{nTransfer}</span>}</button>
      </div>
      {tab === 'members' ? <div role="tabpanel" id="panel-members" aria-labelledby="tab-members">
      <WaitingRoom requests={waiting.data || []} onApprove={(r) => act(() => memberApi.approveJoin(r.request_id))} onReject={(r) => act(() => memberApi.rejectJoin(r.request_id))} onReplace={(r) => setReplaceFor(r)} />
      {replaceFor && <div className="card"><h2>Chọn dòng thành viên cũ để thay thế</h2><Select id="replace-member" defaultValue=""><option value="" disabled>Chọn thành viên</option>{members.data.filter((m) => m.user_id !== replaceFor.user_id).map((m) => <option key={m.member_id} value={m.member_id}>{m.ho_ten} · {ROLES[m.vai_tro] || m.vai_tro} · {m.trang_thai === 'dang_tham_gia' ? 'Đang tham gia' : m.trang_thai === 'da_roi' ? 'Đã rời nhóm' : m.trang_thai}</option>)}</Select><button className="primary" disabled={busy} onClick={() => { const id = document.getElementById('replace-member').value; if (id) act(() => memberApi.replaceMember(replaceFor.request_id, id)).then(() => setReplaceFor(null)) }}>Thay thế người cũ</button><button className="mg-replace-cancel" type="button" onClick={() => setReplaceFor(null)}>Hủy</button></div>}
      <section className="card mg-card"><h2><span className="mg-ico mg-ico-teal"><Users size={18} aria-hidden="true" /></span>Thành viên <span className="mg-count">{active.length}</span></h2>{!members.data.length ? <EmptyState /> : members.data.map((m) => <MemberRow key={m.member_id} member={m} myRole={role} busy={busy} protectedKick={m.user_id === project.data.project?.tao_boi} onRole={(r) => act(() => memberApi.changeRole(m.member_id, r))} onKick={() => setSelectedKick(m)} onRejoin={() => act(() => memberApi.rejoinMember(m.member_id))} onRemove={() => setSelectedRemove(m)} />)}</section>
      {selectedKick && <KickDialog member={selectedKick} onResolve={async ({ choice, reason }) => { if (choice === 'cancel') { setSelectedKick(null); return } const mode = choice === 'reset' ? 'xoa' : 'giu'; if (await act(() => memberApi.kickMember(selectedKick.member_id, reason, mode))) setSelectedKick(null) }} />}
      </div> : <div role="tabpanel" id="panel-work" aria-labelledby="tab-work">
        <section className="card mg-card mg-project">
          <div className="mg-project-head">
            <span className="mg-ico mg-ico-violet mg-ico-lg"><ClipboardList size={26} aria-hidden="true" /></span>
            <div className="mg-project-title"><h2>{pr.ten}</h2>
              <div className="mg-meta">
                <span className={`mg-chip ${archived ? 'mg-chip-purple' : 'mg-chip-green'}`}>{archived ? <Lock size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}{archived ? 'Đã lưu trữ' : 'Đang mở'}</span>
                <span className="mg-chip mg-chip-sky"><Users size={14} aria-hidden="true" />{active.length}/{pr.max_members} thành viên</span>
                <span className={`mg-chip ${pr.bat_binh_chon ? 'mg-chip-amber' : 'mg-chip-gray'}`}><Vote size={14} aria-hidden="true" />Bình chọn {pr.bat_binh_chon ? 'bật' : 'tắt'}</span>
              </div></div>
            <button onClick={() => setEditing(true)}><Pencil size={16} aria-hidden="true" />Chỉnh sửa</button>
          </div>
          <div className="mg-btns">
            <button className="primary" onClick={() => navigate(`/project/${projectId}`)}><LayoutDashboard size={16} aria-hidden="true" />Mở bảng Kanban</button>
            <button className="danger" disabled={busy || archived} onClick={() => setClosing({ warnings: null })}><Flag size={16} aria-hidden="true" />Kết thúc công việc</button>
            {role === 'truong_nhom' && archived && <button disabled={busy} onClick={() => act(() => reportApi.reopenProject(projectId))}><RotateCcw size={16} aria-hidden="true" />Mở lại công việc</button>}
          </div>
        </section>
      <section className="card mg-card"><h2><span className="mg-ico mg-ico-violet"><ArrowRightLeft size={18} aria-hidden="true" /></span>Yêu cầu chuyển giao <span className="mg-count">{nTransfer}</span></h2>{!nTransfer && <p className="mg-muted">Chưa có yêu cầu nào.</p>}{transfers.data?.map((r) => <TransferRequest key={r.id} item={r} members={active} busy={busy} onResolve={(decision,member,type,reason,due) => act(() => transferApi.resolveTransfer(r.id, decision, member, type, reason, due))} />)}</section>
      </div>}
      <CloseProjectDialog open={!!closing} warnings={closing?.warnings} busy={busy} onCancel={() => setClosing(null)} onConfirm={() => closeProject(Array.isArray(closing?.warnings))} />
      <RemoveMemberDialog open={!!selectedRemove} member={selectedRemove} busy={busy} onCancel={() => setSelectedRemove(null)} onConfirm={async () => { if (await act(() => memberApi.removeMemberFromList(selectedRemove.member_id))) setSelectedRemove(null) }} />
      <ProjectSettingsDialog open={editing} onClose={() => setEditing(false)} project={pr} busy={busy} error={error} code={joinCode} onGetCode={() => loadCode(projectApi.getJoinCode)} onRotate={() => loadCode(projectApi.rotateJoinCode)} onDisable={() => act(async () => { await projectApi.disableJoinCode(projectId); setJoinCode(null) })} onSave={(name, max) => act(() => projectApi.updateProjectSettings(projectId, name, max)).then((ok) => ok && setEditing(false))} onVoting={(on) => act(() => voteApi.setVoting(projectId, on))} />
    </>}
  </section>
}
function TransferRequest({ item, members, busy, onResolve }) {
  const [member, setMember] = useState(''), [type, setType] = useState(''), [reason, setReason] = useState(''), [due, setDue] = useState('')
  const supported = item.vai_tro_trong_task === 'ho_tro'
  return <article className="card"><h3>{item.ho_ten} · {item.tien_do}%</h3><p>{item.ly_do}</p>{!supported && <><Select value={member} onChange={(e) => setMember(e.target.value)}><option value="">Chọn người tiếp nhận</option>{members.filter((m) => m.member_id !== item.member_id).map((m) => <option key={m.member_id} value={m.member_id}>{m.ho_ten}</option>)}</Select><Select value={type} onChange={(e) => setType(e.target.value)}><option value="">Chọn loại chuyển</option><option value="khach_quan">Lý do khách quan</option><option value="chua_kip">Chưa kịp tiến độ</option></Select><label>Hạn mới (để trống thì giữ hạn hiện tại)<input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} /></label></>}<button className="primary" disabled={busy || (!supported && (!member || !type))} onClick={() => onResolve(supported ? 'go' : 'chuyen', supported ? null : member, type || null, '', due)}>{supported ? 'Gỡ người hỗ trợ' : 'Chuyển giao'}</button><label>Lý do từ chối<textarea value={reason} onChange={(e) => setReason(e.target.value)} /></label><button className="danger" disabled={busy || reason.trim().length < 10} onClick={() => onResolve('tu_choi', null, null, reason, '')}>Từ chối</button></article>
}
