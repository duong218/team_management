import { rpc } from "./shared";
import { toDueISO } from "../lib/format";
export const requestTransfer = (task, reason) =>
  rpc("xin_chuyen_giao", { p_task: task, p_ly_do: reason });
export const withdrawTransfer = (request) =>
  rpc("rut_yeu_cau_chuyen_giao", { p_yeu_cau: request });
export const transferQueue = (project) =>
  rpc("ds_yeu_cau_chuyen_giao", { p_project: project });
export const resolveTransfer = (request, decision, member, type, reason, dueDate) =>
  rpc("xu_ly_yeu_cau_chuyen_giao", {
    p_yeu_cau: request,
    p_quyet_dinh: decision,
    p_den_member: member,
    p_loai: type,
    p_ly_do_xu_ly: reason,
    p_han_moi: toDueISO(dueDate),
  });
export const transferTask = (task, fromMember, toMember, type, reason, dueDate) =>
  rpc("chuyen_giao_task", {
    p_task: task,
    p_tu_member: fromMember,
    p_den_member: toMember,
    p_loai: type,
    p_ly_do: reason,
    p_han_moi: toDueISO(dueDate),
  });
export const history = (task) => rpc("lich_su_nguoi_chinh", { p_task: task });
export const reviseTransferType = (transfer, type, reason) =>
  rpc("sua_loai_chuyen", { p_id: transfer, p_loai: type, p_ly_do: reason });