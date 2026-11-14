import { useState } from 'react'
import { submitCode, countWaiting } from '../api/joinRequests'
import { createProject } from '../api/projects'
import { getMyTaskStats } from '../api/tasks'
import { useProjects, useJoinRequests, useAsync } from '../hooks'
import { ErrorBox, Skeleton } from '../components/common'
import { ROLES } from '../lib/constants'
import { FolderKanban, Crown, Hourglass, Users, ArrowRight, KeyRound, FolderPlus, ListChecks, Eye } from 'lucide-react'
import GreetingHero from '../components/dashboard/GreetingHero'
import '../styles/projects.css'
const TONES = ['violet', 'sky', 'mint', 'sun', 'peach', 'pink']
const REQ = { cho_duyet: 'Chờ duyệt', da_duyet: 'Đã duyệt', tu_choi: 'Bị từ chối', da_thay_the: 'Đã được thay thế', het_han: 'Hết hạn' }
const STEPS = ['Nhập mã công việc do nhóm trưởng gửi', 'Chờ nhóm trưởng hoặc phó duyệt', 'Nhận task và cập nhật tiến độ']
export default function ProjectListPage({ user, name, duocTao, navigate }) {
  const projects = useProjects(user.id), requests = useJoinRequests(), [pname, setName] = useState(''), [max, setMax] = useState(20), [formError, setFormError] = useState(''), [code, setCode] = useState(''), [joinError, setJoinError] = useState(''), [joinStatus, setJoinStatus] = useState('')
  async function submit(e) { e.preventDefault(); setFormError(''); try { await createProject(pname, Number(max)); setName(''); await projects.reload() } catch (x) { setFormError(x.message) } }
  async function join(e) { e.preventDefault(); setJoinError(''); setJoinStatus(''); try { const result = await submitCode(code.trim()); setJoinStatus(({ da_gui: 'Đã gửi yêu cầu, chờ nhóm trưởng/phó duyệt.', dang_cho: 'Yêu cầu của bạn đang chờ duyệt.', da_o_trong_nhom: 'Bạn đã ở trong công việc này.', ma_sai: 'Mã không đúng hoặc đã tắt.', tam_khoa: 'Bạn nhập sai mã quá nhiều lần. Hãy thử lại sau.', bi_chan: 'Bạn chưa thể gửi yêu cầu vào công việc này.', nhom_day: 'Công việc đã đủ người.' })[result] || 'Không thể tham gia công việc.'); if (result === 'da_o_trong_nhom') await projects.reload(); setCode(''); await requests.reload() } catch (x) { setJoinError(x.message) } }
  const list = (projects.data || []).filter((p) => p.trang_thai === 'dang_hoat_dong'), managed = list.filter((p) => p.vai_tro !== 'thanh_vien'), manageIds = managed.map((p) => p.id)
  const memberProjectIds = list.filter((p) => p.vai_tro === 'thanh_vien').map((p) => p.id)
  const taskStats = useAsync(() => getMyTaskStats(user.id, memberProjectIds), [user.id, memberProjectIds.join(',')])
  // Số người đang chờ vào các nhóm mà bạn là trưởng/phó (thành viên thường không có số này)
  const waiting = useAsync(() => (manageIds.length ? countWaiting(manageIds) : Promise.resolve(0)), [manageIds.join(',')])
  const first = (name || user.user_metadata?.full_name || '').trim().split(/\s+/).slice(-1)[0] || 'bạn'
  const stats = [['blue', FolderKanban, list.length, 'Công việc bạn tham gia'], ...(managed.length ? [['yellow', Crown, managed.length, 'Công việc bạn quản lý'], ['orange', Hourglass, waiting.data ?? 0, 'Người chờ bạn duyệt']] : [['yellow', ListChecks, taskStats.loading ? '—' : taskStats.data?.assigned ?? 0, 'Task được giao'], ['orange', Eye, taskStats.loading ? '—' : taskStats.data?.waitingReview ?? 0, 'Task chờ duyệt']])].map(([tone, Icon, value, label]) => ({ tone, icon: <Icon />, value, label }))
  const subtitle = duocTao ? 'Chọn một công việc để bắt đầu, hoặc tạo công việc mới cho nhóm.' : list.length ? 'Mở công việc nhóm bạn đang tham gia, hoặc nhập mã để xin vào nhóm mới.' : 'Nhập mã do nhóm trưởng gửi để xin vào công việc của nhóm.'
  return <section className="pl">
    <GreetingHero name={first} subtitle={subtitle} stats={stats} />
    {memberProjectIds.length > 0 && taskStats.error && <ErrorBox message={taskStats.error} onRetry={taskStats.reload} />}
    <div className={`pl-layout${list.length || projects.loading ? '' : ' empty'}`}>
      <div className="pl-main">
        <h2 className="pl-h">Công việc của tôi <span className="pl-count">{list.length}</span></h2>
        {projects.loading ? <Skeleton /> : projects.error ? <ErrorBox message={projects.error} onRetry={projects.reload} /> : !list.length ? <div className="card pl-steps"><h3>Bạn chưa ở công việc nào</h3><ol>{STEPS.map((t, i) => <li key={t}><b>{i + 1}</b>{t}</li>)}</ol></div> : <div className="pl-grid">{list.map((p, i) => <article key={p.id} className={`pl-card ${TONES[i % TONES.length]}`}><div className="pl-body"><div className="pl-top"><span className="pl-letter">{(p.ten || '?').trim()[0]?.toUpperCase()}</span><span className="pl-role">{p.vai_tro === 'truong_nhom' ? <Crown size={14} /> : <Users size={14} />}{ROLES[p.vai_tro] || p.vai_tro}</span></div><h3>{p.ten}</h3><span className="pl-max"><Users size={14} />Tối đa {p.max_members} người</span><button className="pl-open" onClick={() => navigate(`/project/${p.id}/dashboard`)}>Mở công việc<ArrowRight size={18} /></button></div></article>)}</div>}
      </div>
      <aside className="pl-side">
        <form className="card inline-form pl-form sky" onSubmit={join}><div className="pl-fh"><span className="pl-ico"><KeyRound size={20} /></span><div><h2>Tham gia bằng mã</h2><small>Nhập mã nhóm trưởng gửi cho bạn</small></div></div><input aria-label="Mã công việc" placeholder="Ví dụ: NTSVNADM" required maxLength={20} autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} />{joinError && <ErrorBox message={joinError} />}{joinStatus && <p role="status" className="pl-status">{joinStatus}</p>}<button className="button primary">Gửi yêu cầu</button></form>
        {requests.loading ? <Skeleton label="Đang tải yêu cầu tham gia…" /> : requests.error ? <ErrorBox message={requests.error} onRetry={requests.reload} /> : requests.data?.length > 0 && <section className="card pl-reqs"><h2>Yêu cầu của tôi</h2>{requests.data.map((r) => <article className="pl-reqrow" key={r.request_id}><div><strong>{r.ten_cong_viec}</strong><small>{new Date(r.tao_luc).toLocaleString('vi-VN')}</small></div><span className="pl-chip">{REQ[r.trang_thai] || r.trang_thai}</span></article>)}</section>}
        {duocTao && <form className="card inline-form pl-form mint" onSubmit={submit}><div className="pl-fh"><span className="pl-ico"><FolderPlus size={20} /></span><div><h2>Tạo công việc</h2><small>Bạn sẽ là nhóm trưởng của công việc này</small></div></div><label>Tên<input required maxLength={100} value={pname} onChange={(e) => setName(e.target.value)} /></label><label>Số thành viên tối đa<input type="number" min="1" max="100" value={max} onChange={(e) => setMax(e.target.value)} /></label>{formError && <ErrorBox message={formError} />}<button className="button primary">Tạo công việc</button></form>}
        {duocTao && <section className="card pl-code-guide" aria-labelledby="pl-code-guide-title"><div className="pl-fh"><span className="pl-ico"><KeyRound size={20} /></span><div><h2 id="pl-code-guide-title">Cách lấy mã gửi cho thành viên</h2><small>Chỉ tài khoản được phép tạo công việc mới thấy hướng dẫn này.</small></div></div><article className="pl-code-step"><h3><span>1</span>Mở phần quản lý công việc</h3><p>Vào <b>Thành viên trong nhóm</b>, chọn tab <b>Công việc</b>, rồi bấm <b>Chỉnh sửa</b>.</p><img src="/huong-dan-ma-cong-viec-buoc-1.png" alt="Bước 1: mở tab Công việc trong Thành viên trong nhóm và chọn Chỉnh sửa" loading="lazy" /></article><article className="pl-code-step"><h3><span>2</span>Xem mã tham gia</h3><p>Trong cửa sổ <b>Chỉnh sửa công việc</b>, tìm mục <b>Mã tham gia</b> và bấm <b>Xem mã</b>. Gửi mã hiện ra cho thành viên.</p><img src="/huong-dan-ma-cong-viec-buoc-2.png" alt="Bước 2: bấm Xem mã trong mục Mã tham gia" loading="lazy" /></article></section>}
      </aside>
    </div>
  </section>
}
