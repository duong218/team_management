import { supabase } from '../supabase'
import { unwrap, withAvatars } from './shared'
export const listMembers = (projectId) => supabase.rpc('ds_thanh_vien_quan_ly', { p_project: projectId }).then(({ data, error }) => { if (error) throw new Error(error.message || 'Không tải được danh sách thành viên.'); return withAvatars(data) })
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
export const leaveProject = (project) => supabase.rpc('roi_nhom', { p_project: project }).then(({ data, error }) => { if (error) throw new Error(error.message || 'Không thể rời công việc.'); return data })
export const changeRole = (member, role) => supabase.rpc('doi_vai_tro', { p_member: member, p_vai_tro: role }).then(({ data, error }) => { if (error) throw new Error(error.message || 'Không đổi được vai trò.'); return data })
