import { rpc } from "./shared";
export const castVote = (task) => rpc("binh_chon_task", { p_task: task });
export const removeVote = (task) => rpc("bo_binh_chon_task", { p_task: task });
export const setVoting = (project, enabled) =>
  rpc("bat_binh_chon", { p_project: project, p_bat: enabled });
export const listVotes = (project) => rpc("ds_binh_chon", { p_project: project });
