import { useState } from 'react'
import { submitCode } from '../api/joinRequests'
import { createProject } from '../api/projects'
import { useProjects, useJoinRequests } from '../hooks'
import { ErrorBox, Skeleton, EmptyState } from '../components/common'
import { ROLES } from '../lib/constants'
import { Sparkles, FolderKanban, Crown, Hourglass, Users, ArrowRight, KeyRound, FolderPlus } from 'lucide-react'
import '../styles/projects.css'
const TONES = ['violet', 'sky', 'mint', 'sun', 'peach', 'pink']
export default function ProjectListPage({ user, duocTao, navigate }) {
  const projects = useProjects(user.id), requests = useJoinRequests(), [name, setName] = useState(''), [max, setMax] = useState(20), [formError, setFormError] = useState(''), [code, setCode] = useState(''), [joinError, setJoinError] = useState(''), [joinStatus, setJoinStatus] = useState('')
  async function submit(e) { e.preventDefault(); setFormError(''); try { await createProject(name, Number(max)); setName(''); await projects.reload() } catch (x) { setFormError(x.message) } }
  async function join(e) { e.preventDefault(); setJoinError(''); setJoinStatus(''); try { const result = await submitCode(code.trim()); setJoinStatus(({ da_gui: 'Đã gửi yêu cầu, chờ nhóm trưởng/phó duyệt.', dang_cho: 'Yêu cầu của bạn đang chờ duyệt.', da_o_trong_nhom: 'Bạn đã ở trong công việc này.', ma_sai: 'Mã không đúng hoặc đã tắt.', tam_khoa: 'Bạn nhập sai mã quá nhiều lần. Hãy thử lại sau.', bi_chan: 'Bạn chưa thể gửi yêu cầu vào công việc này.', nhom_day: 'Công việc đã đủ người.' })[result] || 'Không thể tham gia công việc.'); if (result === 'da_o_trong_nhom') await projects.reload(); setCode(''); await requests.reload() } catch (x) { setJoinError(x.message) } }
  const list = projects.data || [], leaderCount = list.filter((p) => p.vai_tro === 'truong_nhom').length
  const first = (user.user_metadata?.full_name || '').trim().split(/\s+/).slice(-1)[0] || 'bạn'
  const stats = [['sky', FolderKanban, list.length, 'Công việc của bạn'], ['sun', Crown, leaderCount, 'Bạn làm nhóm trưởng'], ['peach', Hourglass, requests.data?.length || 0, 'Yêu cầu đã gửi']]
  return <section className="pl">
    <header className="pl-hero">
      <div className="pl-hello"><span className="pl-eyebrow"><Sparkles size={16} />Không gian của bạn</span><h1>Chào {first}!</h1><p>Chọn một công việc để bắt đầu, hoặc tạo công việc mới cho nhóm.</p></div>
      <div className="pl-stats">{stats.map(([tone, Icon, n, label]) => <div className={`pl-stat ${tone}`} key={label}><span className="pl-ico"><Icon size={20} /></span><b>{n}</b><small>{label}</small></div>)}</div>
    </header>
    <h2 className="pl-h">Công việc của tôi</h2>
    {projects.loading ? <Skeleton /> : projects.error ? <ErrorBox message={projects.error} onRetry={projects.reload} /> : !list.length ? <EmptyState title="Bạn chưa ở công việc nào">Tạo công việc mới hoặc tham gia bằng mã mời.</EmptyState> : <div className="pl-grid">{list.map((p, i) => <article key={p.id} className={`pl-card ${TONES[i % TONES.length]}`}><div className="pl-band"><span className="pl-letter">{(p.ten || '?').trim()[0]?.toUpperCase()}</span></div><div className="pl-body"><h3>{p.ten}</h3><div className="pl-meta"><span className="pl-role">{p.vai_tro === 'truong_nhom' ? <Crown size={14} /> : <Users size={14} />}{ROLES[p.vai_tro] || p.vai_tro}</span><span className="pl-max"><Users size={14} />tối đa {p.max_members} người</span></div><button className="pl-open" onClick={() => navigate(`/project/${p.id}`)}>Mở công việc<ArrowRight size={18} /></button></div></article>)}</div>}
    {requests.loading ? <Skeleton label="Đang tải yêu cầu tham gia…" /> : requests.error ? <ErrorBox message={requests.error} onRetry={requests.reload} /> : requests.data?.length > 0 && <section><h2 className="pl-h">Yêu cầu của tôi</h2><div className="pl-req">{requests.data.map((r) => <article className="card" key={r.request_id}><strong>{r.ten_cong_viec}</strong><p>{r.trang_thai} · {new Date(r.tao_luc).toLocaleString('vi-VN')}</p></article>)}</div></section>}
    <div className="forms">
      <form className="card inline-form pl-form sky" onSubmit={join}><div className="pl-fh"><span className="pl-ico"><KeyRound size={20} /></span><div><h2>Tham gia bằng mã</h2><small>Nhập mã nhóm trưởng gửi cho bạn</small></div></div><label>Mã công việc<input required maxLength={20} autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} /></label>{joinError && <ErrorBox message={joinError} />}{joinStatus && <p role="status">{joinStatus}</p>}<button className="button primary">Gửi yêu cầu</button></form>
      {duocTao && <form className="card inline-form pl-form mint" onSubmit={submit}><div className="pl-fh"><span className="pl-ico"><FolderPlus size={20} /></span><div><h2>Tạo công việc</h2><small>Bạn sẽ là nhóm trưởng của công việc này</small></div></div><label>Tên<input required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} /></label><label>Số thành viên tối đa<input type="number" min="1" max="100" value={max} onChange={(e) => setMax(e.target.value)} /></label>{formError && <ErrorBox message={formError} />}{projects.error && <ErrorBox message={projects.error} onRetry={projects.reload} />}<button className="button primary">Tạo công việc</button></form>}
    </div>
  </section>
}