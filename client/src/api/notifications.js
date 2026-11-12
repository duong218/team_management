import { supabase } from '../supabase'
import { unwrap, rpc } from './shared'
export const listNotifications = (memberId) => unwrap(supabase.from('thong_bao').select('id,member_id,loai,task_id,noi_dung,da_doc,thoi_gian').eq('member_id', memberId).order('thoi_gian', { ascending: false }).limit(50))
export const listNotificationsForUser = async (userId) => {
  const members = await unwrap(supabase.from('members').select('id').eq('user_id', userId))
  if (!members.length) return []
  return unwrap(supabase.from('thong_bao').select('id,member_id,loai,task_id,noi_dung,da_doc,thoi_gian').in('member_id', members.map((x) => x.id)).order('thoi_gian', { ascending: false }).limit(50))
}
export const markRead = (notification) => rpc('doc_thong_bao', { p_thong_bao: notification })
