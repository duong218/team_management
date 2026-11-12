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
