import { rpc } from './shared'
export const getReport = (project) => rpc('bao_cao_cong_viec', { p_project: project })
export const closeProject = (project, confirm = false) => rpc('ket_thuc_cong_viec', { p_project: project, p_xac_nhan: confirm })
export const reopenProject = (project) => rpc('mo_lai_cong_viec', { p_project: project })
export const adjustScore = (project, member, score, reason) => rpc('dieu_chinh_diem', { p_project: project, p_member: member, p_diem: score, p_ly_do: reason })
export const adjustContribution = (task, allocations, reason) => rpc('xin_muc_dong_gop', { p_task: task, p_phan_bo: allocations, p_ly_do: reason })
