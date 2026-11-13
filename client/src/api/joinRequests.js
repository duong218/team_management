import { rpc, withAvatars } from './shared'
export const listMine = () => rpc('yeu_cau_cua_toi')
export const listWaiting = (project) => rpc('phong_cho_full', { p_project: project }).then(withAvatars)
export const submitCode = (code) => rpc('nhap_ma', { p_ma: code })
export const approveNew = (request) => rpc('duyet_moi', { p_request: request })
export const approveReplacement = (request, member) => rpc('duyet_thay_the', { p_request: request, p_member: member })
export const reject = (request) => rpc('tu_choi_yeu_cau', { p_request: request })
// Tổng số người đang chờ trong phòng chờ của nhiều công việc (chỉ trưởng/phó mới gọi được hàm này cho từng công việc)
export const countWaiting = (projects) => Promise.all(projects.map((id) => rpc('phong_cho_full', { p_project: id }))).then((lists) => lists.reduce((n, l) => n + (l?.length || 0), 0))