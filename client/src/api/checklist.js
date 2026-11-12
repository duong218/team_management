import { rpc } from "./shared";
export const listChecklist = (taskId) =>
  rpc("danh_sach_checklist", { p_task: taskId });
export const listTaskContributions = (taskId) =>
  rpc("dong_gop_task", { p_task: taskId });
export const toggleChecklistItem = (item, checked) =>
  rpc("tick_muc", { p_muc: item, p_da_xong: checked });
export const addChecklistItem = (task, content) =>
  rpc("them_muc_task", { p_task: task, p_noi_dung: content, p_trong_so: 1 });
export const proposeChecklistItem = (task, content) =>
  rpc("de_xuat_muc", { p_task: task, p_noi_dung: content });
export const reviewChecklistItem = (item, approve, reason = null) =>
  rpc("xu_ly_de_xuat_muc", { p_muc: item, p_duyet: approve, p_ly_do: reason });
export const updateChecklistItem = (item, content, weight) =>
  rpc("cap_nhat_muc_task", { p_muc: item, p_noi_dung: content, p_trong_so: weight });
export const deleteChecklistItem = (item) => rpc("xoa_muc_task", { p_muc: item });
