import { supabase } from "../supabase";
export async function unwrap(
  query,
  fallback = "Không thể tải dữ liệu. Hãy thử lại.",
) {
  const { data, error } = await query;
  if (error) throw new Error(error.message || fallback);
  return data;
}
export async function rpc(
  name,
  args = {},
  fallback = "Thao tác chưa thành công. Hãy thử lại.",
) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message || fallback);
  return data;
}
// Bổ sung ảnh đại diện cho dòng chưa có sẵn. Người chưa/không còn là thành viên bị RLS chặn đọc profiles, nên hàm SQL (14_*.sql) trả ảnh trực tiếp; đây chỉ là dự phòng.
export async function withAvatars(rows) {
  const ids = [...new Set((rows || []).map((r) => r.user_id).filter(Boolean))];
  if (!ids.length) return rows;
  const { data } = await supabase.from("profiles").select("user_id,anh_dai_dien").in("user_id", ids);
  const by = new Map((data || []).map((p) => [p.user_id, p.anh_dai_dien]));
  return rows.map((r) => ({ ...r, anh_dai_dien: r.anh_dai_dien || by.get(r.user_id) || null }));
}
