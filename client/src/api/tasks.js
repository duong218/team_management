import { supabase } from '../supabase'
import { unwrap, rpc } from './shared'
import { toDueISO } from '../lib/format'
const TASK_COLUMNS = 'id,project_id,trang_thai,trang_thai_truoc_huy,tien_do,han_chot,ly_do_huy,cap_nhat_luc,tao_luc'
const DETAIL_COLUMNS = 'task_id,tieu_de,mo_ta,tep_dinh_kem,binh_luan'
export const getMyTaskStats = async (userId, projectIds) => {
  if (!projectIds.length) return { assigned: 0, waitingReview: 0 }
  const members = await unwrap(supabase.from('members').select('id').eq('user_id', userId).eq('trang_thai', 'dang_tham_gia').in('project_id', projectIds))
  if (!members.length) return { assigned: 0, waitingReview: 0 }
  const assignments = await unwrap(supabase.from('task_assignees').select('task_id').eq('trang_thai', 'dang_lam').in('member_id', members.map((m) => m.id)))
  const taskIds = [...new Set(assignments.map((a) => a.task_id))]
  if (!taskIds.length) return { assigned: 0, waitingReview: 0 }
  const tasks = await unwrap(supabase.from('tasks').select('id,trang_thai').in('id', taskIds).neq('trang_thai', 'da_huy'))
  return { assigned: tasks.length, waitingReview: tasks.filter((t) => t.trang_thai === 'cho_duyet').length }
}
export const listTasks = async (projectId) => {
  const tasks = await unwrap(supabase.from('tasks').select(TASK_COLUMNS).eq('project_id', projectId).neq('trang_thai', 'da_huy').order('tao_luc'))
  if (!tasks.length) return []
  const [details, assignments, members] = await Promise.all([
    unwrap(supabase.from('task_details').select(DETAIL_COLUMNS).in('task_id', tasks.map((t) => t.id))),
    unwrap(supabase.from('task_assignees').select('task_id,member_id,vai_tro_trong_task,trang_thai').in('task_id', tasks.map((t) => t.id))),
    unwrap(supabase.from('members').select('id,user_id,vai_tro,trang_thai')),
  ])
  const detailMap = Object.fromEntries(details.map((x) => [x.task_id, x]))
  const memberIds = new Set(assignments.map((x) => x.member_id))
  const assignedMembers = members.filter((m) => memberIds.has(m.id))
  const profiles = assignedMembers.length ? await unwrap(supabase.from('profiles').select('user_id,ho_ten,anh_dai_dien').in('user_id', assignedMembers.map((m) => m.user_id))) : []
  const people = Object.fromEntries(assignedMembers.map((m) => [m.id, { ...m, ...profiles.find((p) => p.user_id === m.user_id) }]))
  return tasks.map((t) => ({ ...t, ...detailMap[t.id], assignees: assignments.filter((a) => a.task_id === t.id).map((a) => ({ ...a, member: people[a.member_id] })) }))
}
export const getTaskDetails = (taskId) => unwrap(supabase.from('task_details').select(DETAIL_COLUMNS).eq('task_id', taskId).maybeSingle())
export const getTask = async (id) => {
  const task = await unwrap(supabase.from('tasks').select(TASK_COLUMNS).eq('id', id).maybeSingle())
  if (!task) return null
  const detail = await getTaskDetails(id)
  const assignees = await unwrap(supabase.from('task_assignees').select('task_id,member_id,vai_tro_trong_task,trang_thai,giao_boi,thoi_gian_giao').eq('task_id', id))
  const people = assignees.length ? await unwrap(supabase.from('members').select('id,user_id,vai_tro,trang_thai').eq('project_id', task.project_id).in('id', assignees.map((a) => a.member_id))) : []
  const profiles = people.length ? await unwrap(supabase.from('profiles').select('user_id,ho_ten,don_vi,anh_dai_dien').in('user_id', people.map((p) => p.user_id))) : []
  const profileMap = Object.fromEntries(profiles.map((p) => [p.user_id, p]))
  const memberMap = Object.fromEntries(people.map((m) => [m.id, { ...m, ...profileMap[m.user_id] }]))
  const checklist = detail ? await rpc('danh_sach_checklist', { p_task: id }) : []
  const links = detail && checklist.length ? await unwrap(supabase.from('task_links').select('id,task_id,muc_id,url,url_chuan_hoa,ghi_chu,nguoi_them,thoi_gian,trang_thai_link,ly_do_tu_choi').eq('task_id', id).order('thoi_gian')) : []
  const current = await supabase.auth.getUser()
  const currentMember = people.find((m) => m.user_id === current.data.user?.id)
  const isManager = people.some((m) => m.user_id === current.data.user?.id && ['truong_nhom', 'pho_nhom'].includes(m.vai_tro) && m.trang_thai === 'dang_tham_gia')
  const history = detail && (isManager || assignees.some((a) => a.member_id === currentMember?.id)) ? await rpc('lich_su_nguoi_chinh', { p_task: id }) : []
  const activity = detail && (isManager || assignees.some((a) => a.member_id === currentMember?.id)) ? await unwrap(supabase.from('activity_log').select('id,project_id,task_id,member_id,hanh_dong,tien_do_truoc,tien_do_sau,thoi_gian').eq('task_id', id).order('thoi_gian')) : []
  return { ...task, ...detail, assignees: assignees.map((a) => ({ ...a, member: memberMap[a.member_id] })), checklist, links, history, activity, memberId: currentMember?.id }
}
export const listCancelledTasks = async (projectId) => {
  const tasks = await unwrap(supabase.from('tasks').select(TASK_COLUMNS).eq('project_id', projectId).eq('trang_thai', 'da_huy').order('cap_nhat_luc', { ascending: false }))
  if (!tasks.length) return []
  const details = await unwrap(supabase.from('task_details').select(DETAIL_COLUMNS).in('task_id', tasks.map((t) => t.id)))
  const byId = Object.fromEntries(details.map((d) => [d.task_id, d]))
  return tasks.map((t) => ({ ...t, ...byId[t.id] }))
}
export const createTask = (project, title, description, dueDate, checklist) => rpc('tao_task', { p_project: project, p_tieu_de: title, p_mo_ta: description, p_han_chot: toDueISO(dueDate), p_checklist: checklist })
export const createAssignedTask = (project, title, description, dueDate, checklist, member) => rpc('tao_task_giao', { p_project: project, p_tieu_de: title, p_mo_ta: description, p_han_chot: toDueISO(dueDate), p_checklist: checklist, p_member: member })
export const updateTask = (id, title, description, dueDate, dueReason, updatedAt) => rpc('cap_nhat_task', { p_task: id, p_tieu_de: title, p_mo_ta: description, p_han_chot: toDueISO(dueDate), p_ly_do_han: dueReason || null, p_cap_nhat_luc: updatedAt })
export const assignTask = (task, member, role = 'chinh') => rpc('gan_task', { p_task: task, p_member: member, p_vai_tro: role })
export const startTask = (task) => rpc('bat_dau_task', { p_task: task })
export const submitTask = (task) => rpc('gui_duyet_task', { p_task: task })
export const approveTask = (task) => rpc('duyet_task', { p_task: task })
export const returnTask = (task, reason, unchecked = []) => rpc('tra_lai_task', { p_task: task, p_ly_do: reason, p_bo_tick: unchecked })
export const cancelTask = (task, reason) => rpc('huy_task', { p_task: task, p_ly_do: reason })
export const restoreTask = (task, reason) => rpc('khoi_phuc_task', { p_task: task, p_ly_do: reason })
export const reopenTask = (task, reason) => rpc('mo_lai_task', { p_task: task, p_ly_do: reason })
export const deleteUnusedTask = (task) => rpc('xoa_task_trong', { p_task: task })
export const addComment = (task, comment) => rpc('them_binh_luan', { p_task: task, p_binh_luan: comment })
export const listComments = async (taskId) => {
  const rows = await unwrap(supabase.from('task_comments').select('id,user_id,noi_dung,tao_luc').eq('task_id', taskId).order('tao_luc'))
  const ids = [...new Set(rows.map((r) => r.user_id))]
  const people = ids.length ? await unwrap(supabase.from('profiles').select('user_id,ho_ten,anh_dai_dien').in('user_id', ids)) : []
  const by = new Map(people.map((p) => [p.user_id, p]))
  return rows.map((r) => ({ ...r, ho_ten: by.get(r.user_id)?.ho_ten, anh_dai_dien: by.get(r.user_id)?.anh_dai_dien }))
}
