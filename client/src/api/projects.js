import { supabase } from "../supabase";
import { unwrap, rpc } from "./shared";
export const listProjects = async (userId) => {
  const [p, m] = await Promise.all([
    unwrap(
      supabase
        .from("projects")
        .select(
          "id,ten,max_members,trang_thai,tao_boi,bat_binh_chon,trong_so_diem",
        )
        .order("id"),
    ),
    unwrap(
      supabase
        .from("members")
        .select("project_id,vai_tro")
        .eq("user_id", userId)
        .eq("trang_thai", "dang_tham_gia"),
    ),
  ]);
  const roles = Object.fromEntries(m.map((x) => [x.project_id, x.vai_tro]));
  return p
    .filter((x) => roles[x.id])
    .map((x) => ({ ...x, vai_tro: roles[x.id] }));
};
export const createProject = (ten, max) =>
  rpc("tao_cong_viec", { p_ten: ten, p_max_members: max });
export const getProject = async (id) => {
  const project = await unwrap(
    supabase
      .from("projects")
      .select(
        "id,ten,max_members,trang_thai,tao_boi,bat_binh_chon,trong_so_diem",
      )
      .eq("id", id)
      .maybeSingle(),
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const member = user
    ? await unwrap(
        supabase
          .from("members")
          .select("vai_tro")
          .eq("project_id", id)
          .eq("user_id", user.id)
          .eq("trang_thai", "dang_tham_gia")
          .maybeSingle(),
      )
    : null;
  return { project, vaiTro: member?.vai_tro ?? null };
};
export const getJoinCode = (project) => rpc("lay_ma", { p_project: project });
export const rotateJoinCode = (project) =>
  rpc("doi_ma", { p_project: project });
export const disableJoinCode = (project) =>
  rpc("tat_ma", { p_project: project });
export const updateScoreWeights = (project, weights) =>
  rpc("cap_nhat_trong_so_diem", { p_project: project, p_trong_so: weights });
export const updateProjectSettings = (project, name, maxMembers) =>
  rpc("cap_nhat_cong_viec", { p_project: project, p_ten: name, p_max_members: maxMembers });
