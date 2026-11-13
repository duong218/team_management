import { supabase } from '../supabase'
import { unwrap, withAvatars } from './shared'
export const listMembers = (projectId) => supabase.rpc('ds_thanh_vien_quan_ly', { p_project: projectId }).then(({ data, error }) => { if (error) throw new Error(error.message || 'Không tải được danh sách thành viên.'); return withAvatars(data) })
export const listCurrentMembers = async (projectId) => {
  const rows = await unwrap(supabase.from('members').select('id,user_id,vai_tro,trang_thai').eq('project_id', projectId).eq('trang_thai', 'dang_tham_gia').eq('an_khoi_danh_sach', false))
  if (!rows.length) return []
  const profiles = await unwrap(supabase.from('profiles').select('user_id,ho_ten,don_vi,anh_dai_dien').in('user_id', rows.map((m) => m.user_id)))
  const byUser = new Map(profiles.map((p) => [p.user_id, p]))
  return rows.map((m) => ({ member_id: m.id, user_id: m.user_id, vai_tro: m.vai_tro, trang_thai: m.trang_thai, ...byUser.get(m.user_id) }))
}
export const listWaiting = (projectId) => supabase.rpc('phong_cho_full', { p_project: projectId }).then(({ data, error }) => { if (error) throw new Error(error.message || 'Không tải được phòng chờ.'); return withAvatars(data) })
export const getMyMember = async (projectId) => {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error(authError?.message || 'Bạn chưa đăng nhập.')
  return unwrap(supabase.from('members').select('id,project_id,user_id,vai_tro,trang_thai').eq('project_id', projectId).eq('user_id', user.id).eq('trang_thai', 'dang_tham_gia').maybeSingle())
}
export const approveJoin = (request) => supabase.rpc('duyet_moi', { p_request: request }).then(({ data, error }) => { if (error) throw new Error(error.message || 'Không duyệt được yêu cầu.'); return data })
export const replaceMember = (request, member) => supabase.rpc('duyet_thay_the', { p_request: request, p_member: member }).then(({ data, error }) => { if (error) throw new Error(error.message || 'Không thay thế được thành viên.'); return data })
export const rejectJoin = (request) => supabase.rpc('tu_choi_yeu_cau', { p_request: request }).then(({ data, error }) => { if (error) throw new Error(error.message || 'Không từ chối được yêu cầu.'); return data })
export const kickMember = (member, reason, progressAction) => supabase.rpc('loai_thanh_vien', { p_member: member, p_ly_do: reason, p_xu_ly_tien_do: progressAction }).then(({ data, error }) => { if (error) throw new Error(error.message || 'Không loại được thành viên.'); return data })
export const rejoinMember = (member) => supabase.rpc('moi_lai', { p_member: member }).then(({ data, error }) => { if (error) throw new Error(error.message || 'Không thể mời lại thành viên.'); return data })
export const removeMemberFromList = (member) => supabase.rpc('xoa_thanh_vien_khoi_danh_sach', { p_member: member }).then(({ data, error }) => { if (error) throw new Error(error.message || 'Không thể xóa thành viên khỏi danh sách.'); return data })
export const leaveProject = (project) => supabase.rpc('roi_nhom', { p_project: project }).then(({ data, error }) => { if (error) throw new Error(error.message || 'Không thể rời công việc.'); return data })
export const changeRole = (member, role) => supabase.rpc('doi_vai_tro', { p_member: member, p_vai_tro: role }).then(({ data, error }) => { if (error) throw new Error(error.message || 'Không đổi được vai trò.'); return data })
