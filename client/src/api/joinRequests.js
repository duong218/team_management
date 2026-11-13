import { rpc, withAvatars } from './shared'
export const listMine = () => rpc('yeu_cau_cua_toi')
export const listWaiting = (project) => rpc('phong_cho_full', { p_project: project }).then(withAvatars)
export const submitCode = (code) => rpc('nhap_ma', { p_ma: code })
export const approveNew = (request) => rpc('duyet_moi', { p_request: request })
export const approveReplacement = (request, member) => rpc('duyet_thay_the', { p_request: request, p_member: member })
export const reject = (request) => rpc('tu_choi_yeu_cau', { p_request: request })
