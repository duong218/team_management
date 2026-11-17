import { rpc } from "./shared";
import { supabase } from "../supabase";
export const castVote = (task) => rpc("binh_chon_task", { p_task: task });
export const removeVote = (task) => rpc("bo_binh_chon_task", { p_task: task });
export const setVoting = (project, enabled) =>
  rpc("bat_binh_chon", { p_project: project, p_bat: enabled });
export const listVotes = (project) => rpc("ds_binh_chon", { p_project: project });
export const endVoting = (project) => rpc("ket_thuc_binh_chon", { p_project: project });
export const myVotes = (project) => rpc("phieu_cua_toi", { p_project: project });
export const voteEnded = async (project) => {
  const { data, error } = await supabase.from("projects").select("binh_chon_ket_thuc").eq("id", project).maybeSingle();
  if (error) throw new Error(error.message);
  return !!data?.binh_chon_ket_thuc;
};