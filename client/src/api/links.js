import { supabase } from "../supabase";
import { unwrap, rpc } from "./shared";
export const addLink = (item, url, note = "") =>
  rpc("them_link", { p_muc: item, p_url: url, p_ghi_chu: note });
export const rejectLink = (link, reason) =>
  rpc("tu_choi_link", { p_link: link, p_ly_do: reason });
export const deleteLink = (link) => rpc("xoa_link", { p_link: link });
export const listLinks = (task) =>
  unwrap(
    supabase
      .from("task_links")
      .select("id,task_id,muc_id,url,ghi_chu,nguoi_them,thoi_gian,trang_thai_link,ly_do_tu_choi")
      .eq("task_id", task)
      .order("thoi_gian"),
  );
