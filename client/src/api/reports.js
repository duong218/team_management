import { supabase } from '../supabase'
import { rpc } from './shared'
// Báo cáo gộp thành viên theo mã định danh (user_ids là mảng): lấy ảnh Google đầu tiên tìm được. Lỗi thì bỏ qua.
export const getReport = (project) => rpc('bao_cao_cong_viec', { p_project: project }).then(async (r) => {
  const ms = r?.members || [], ids = [...new Set(ms.flatMap((m) => m.user_ids || []))]
  if (!ids.length) return r
  const { data } = await supabase.from('profiles').select('user_id,anh_dai_dien').in('user_id', ids)
  const by = new Map((data || []).map((p) => [p.user_id, p.anh_dai_dien]))
  return { ...r, members: ms.map((m) => ({ ...m, anh_dai_dien: (m.user_ids || []).map((u) => by.get(u)).find(Boolean) || null })) }
})
export const closeProject = (project, confirm = false) => rpc('ket_thuc_cong_viec', { p_project: project, p_xac_nhan: confirm })
export const reopenProject = (project) => rpc('mo_lai_cong_viec', { p_project: project })
export const adjustScore = (project, member, score, reason) => rpc('dieu_chinh_diem', { p_project: project, p_member: member, p_diem: score, p_ly_do: reason })
export const adjustContribution = (task, allocations, reason) => rpc('xin_muc_dong_gop', { p_task: task, p_phan_bo: allocations, p_ly_do: reason })
