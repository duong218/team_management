import ExcelJS from "exceljs";
import { ROLES, STATES } from "./constants";

const STATUS_STYLE = {
  can_lam: ["FFDBF2FF", "FF075985"],
  dang_lam: ["FFFFF1B8", "FF854D0E"],
  cho_duyet: ["FFFFDEC2", "FF9A3412"],
  hoan_thanh: ["FFD7F7E2", "FF166534"],
  da_huy: ["FFFFE0E5", "FF9F1239"],
};
const border = { bottom: { style: "thin", color: { argb: "FFE8E3F2" } } };
const titleStyle = (cell, size = 18) => {
  cell.font = { name: "Aptos Display", size, bold: true, color: { argb: "FF32166F" } };
  cell.alignment = { vertical: "middle" };
};
const toVietnamDate = (value) => {
  if (!value) return null;
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value)).map(({ type, value: part }) => [type, part]));
  return new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second));
};
const headerStyle = (row) => row.eachCell((cell) => {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF432080" } };
  cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  cell.alignment = { vertical: "middle", wrapText: true };
  cell.border = border;
});
const save = async (workbook, projectName) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const link = document.createElement("a"), safeName = (projectName || "cong-viec").split("").filter((char) => char.charCodeAt(0) >= 32).join("").replace(/[<>:"/\\|?*]/g, "-").trim();
  link.href = url;
  link.download = `bao-cao-${safeName || "cong-viec"}.xlsx`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

export async function downloadExcelReport(report) {
  const projectName = report.project?.ten || "Công việc", members = report.members || [], tasks = report.tasks || [];
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Ocean";
  workbook.subject = `Báo cáo ${projectName}`;
  workbook.created = new Date();

  const overview = workbook.addWorksheet("Tổng quan", { views: [{ state: "frozen", ySplit: 9 }] });
  overview.columns = [{ width: 30 }, { width: 22 }, { width: 22 }, { width: 16 }];
  overview.mergeCells("A1:D1"); overview.getCell("A1").value = "BÁO CÁO CÔNG VIỆC"; titleStyle(overview.getCell("A1"), 20);
  overview.mergeCells("A2:D2"); overview.getCell("A2").value = projectName; titleStyle(overview.getCell("A2"), 16);
  overview.mergeCells("A3:D3"); overview.getCell("A3").value = `Ngày xuất: ${new Intl.DateTimeFormat("vi-VN", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date())}`;
  overview.getCell("A3").font = { color: { argb: "FF716887" }, italic: true };
  overview.getRow(1).height = 32; overview.getRow(2).height = 26; overview.getRow(3).height = 22;
  const completed = tasks.filter((task) => task.trang_thai === "hoan_thanh").length;
  const average = tasks.length ? tasks.reduce((sum, task) => sum + Math.min(100, Math.max(0, Number(task.tien_do) || 0)), 0) / tasks.length : 0;
  const cards = [["Thành viên", members.length], ["Task", tasks.length], ["Đã hoàn thành", completed], ["Tiến độ trung bình", average / 100]];
  cards.forEach(([label, value], index) => {
    const col = index + 1, head = overview.getCell(5, col), val = overview.getCell(6, col);
    head.value = label; val.value = value;
    head.fill = val.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ["FFEBE5FF", "FFE1F2FF", "FFE1F6E8", "FFFFF0CC"][index] } };
    head.font = { bold: true, color: { argb: "FF62527C" }, size: 10 };
    val.font = { bold: true, color: { argb: "FF32166F" }, size: 16 };
    head.alignment = val.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    if (index === 3) val.numFmt = "0.0%";
  });
  overview.getRow(5).height = 28; overview.getRow(6).height = 34;
  overview.mergeCells("A8:D8"); overview.getCell("A8").value = "THÀNH VIÊN"; titleStyle(overview.getCell("A8"), 13);
  const memberHeader = overview.getRow(9); memberHeader.values = ["Thành viên", "Vai trò", "Trạng thái", "Điểm"];
  headerStyle(memberHeader); memberHeader.height = 26;
  members.forEach((member) => {
    const row = overview.addRow([member.ho_ten || "Chưa có tên", ROLES[member.vai_tro] || member.vai_tro || "", "", member.diem?.diem == null ? null : Number(member.diem.diem)]);
    row.eachCell((cell) => { cell.border = border; cell.alignment = { vertical: "middle" }; });
    const role = row.getCell(2), status = row.getCell(3);
    role.fill = { type: "pattern", pattern: "solid", fgColor: { argb: member.vai_tro === "truong_nhom" ? "FFFFF1B8" : member.vai_tro === "pho_nhom" ? "FFE9E3FF" : "FFE1F2FF" } };
    status.value = member.trang_thai === "dang_tham_gia" ? "Đang tham gia" : member.trang_thai === "da_roi" ? "Đã rời nhóm" : member.trang_thai || "Chưa rõ";
    status.fill = { type: "pattern", pattern: "solid", fgColor: { argb: member.trang_thai === "dang_tham_gia" ? "FFD7F7E2" : "FFF0EDF6" } };
    status.font = { bold: true, color: { argb: member.trang_thai === "dang_tham_gia" ? "FF166534" : "FF716887" } };
    row.getCell(4).numFmt = "0.00";
  });
  overview.autoFilter = { from: "A9", to: `D${Math.max(9, overview.rowCount)}` };

  const sheet = workbook.addWorksheet("Tiến độ task", { views: [{ state: "frozen", ySplit: 5 }] });
  sheet.columns = [{ width: 34 }, { width: 42 }, { width: 18 }, { width: 16 }, { width: 22 }, { width: 36 }, { width: 20 }];
  sheet.mergeCells("A1:G1"); sheet.getCell("A1").value = "DANH SÁCH TASK"; titleStyle(sheet.getCell("A1"), 20);
  sheet.mergeCells("A2:G2"); sheet.getCell("A2").value = projectName; titleStyle(sheet.getCell("A2"), 16);
  sheet.mergeCells("A3:G3"); sheet.getCell("A3").value = "Tiến độ hiển thị theo phần trăm. Thanh màu biểu thị mức hoàn thành.";
  sheet.getCell("A3").font = { color: { argb: "FF716887" }, italic: true };
  const taskHeader = sheet.getRow(5); taskHeader.values = ["Tên task", "Mô tả", "Trạng thái", "Tiến độ", "Hạn chót", "Người được giao", "Checklist"];
  headerStyle(taskHeader); taskHeader.height = 28;
  tasks.forEach((task) => {
    const progress = Math.min(100, Math.max(0, Number(task.tien_do) || 0));
    const checklist = task.checklist || [];
    const names = (task.assignees || []).map((assignee) => assignee.ho_ten || assignee.member?.ho_ten).filter(Boolean).join(", ");
    const row = sheet.addRow([task.tieu_de || "Task giao cho bạn", task.mo_ta || "", "", progress / 100, toVietnamDate(task.han_chot), names || "Chưa giao", checklist.length ? `${checklist.filter((item) => item.da_xong).length}/${checklist.length}` : "Chưa có mục"]);
    row.height = 32;
    row.eachCell((cell) => { cell.border = border; cell.alignment = { vertical: "middle", wrapText: true }; });
    row.getCell(1).font = { bold: true, color: { argb: "FF32166F" } };
    row.getCell(3).value = STATES[task.trang_thai] || task.trang_thai || "Chưa rõ";
    const [fill, color] = STATUS_STYLE[task.trang_thai] || ["FFF0EDF6", "FF51466A"];
    row.getCell(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
    row.getCell(3).font = { bold: true, color: { argb: color } };
    row.getCell(3).alignment = { vertical: "middle", horizontal: "center" };
    row.getCell(4).numFmt = "0.00%";
    row.getCell(4).alignment = { vertical: "middle", horizontal: "center" };
    row.getCell(5).numFmt = "dd/mm/yyyy hh:mm";
  });
  sheet.autoFilter = { from: "A5", to: `G${Math.max(5, sheet.rowCount)}` };
  if (tasks.length) sheet.addConditionalFormatting({ ref: `D6:D${sheet.rowCount}`, rules: [{ type: "dataBar", priority: 1, minLength: 0, maxLength: 100, showValue: true, gradient: false, cfvo: [{ type: "num", value: 0 }, { type: "num", value: 1 }], color: { argb: "FF7C3AED" } }] });
  await save(workbook, projectName);
}
