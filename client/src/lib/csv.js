export function toCsv(rows) {
  const esc = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  return "\uFEFF" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
}
export function downloadCsv(name, rows) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }),
    a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
