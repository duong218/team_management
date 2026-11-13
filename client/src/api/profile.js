import { supabase } from "../supabase";
import { unwrap, rpc } from "./shared";
export const getProfile = (userId) =>
  unwrap(
    supabase
      .from("profiles")
      .select("user_id,ho_ten,don_vi,duoc_tao_cong_viec,anh_dai_dien")
      .eq("user_id", userId)
      .maybeSingle(),
  );
export const saveProfile = (hoTen, ma, donVi) =>
  rpc("luu_ho_so", { p_ho_ten: hoTen, p_ma_dinh_danh: ma, p_don_vi: donVi });
export const saveAvatar = (url) => rpc("cap_nhat_anh_dai_dien", { p_url: url });