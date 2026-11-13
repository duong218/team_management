export const vnTime = (v) =>
  v
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(new Date(v))
    : "—";
export const pct = (n) => `${Number(n || 0).toFixed(2)}%`;
export function largestRemainder(values) {
  const sum = values.reduce((a, b) => a + Number(b.value || 0), 0);
  if (!sum) return values.map((v) => ({ ...v, percent: null }));
  const exact = values.map((v) => (Number(v.value || 0) * 10000) / sum),
    base = exact.map(Math.floor);
  let extra = 10000 - base.reduce((a, b) => a + b, 0);
  const order = exact
    .map((x, i) => ({ i, r: x - base[i] }))
    .sort((a, b) => b.r - a.r);
  for (let j = 0; j < extra; j++) base[order[j].i]++;
  return values.map((v, i) => ({ ...v, percent: (base[i] / 100).toFixed(2) }));
}

// Hạn chót có giờ. Ô datetime-local cho "YYYY-MM-DDTHH:mm" (không múi giờ) nên gắn +07:00 để không bị lệch 7 tiếng.
export const toDueISO = (v) => (!v ? null : v.length === 10 ? `${v}T23:59:00+07:00` : v.length === 16 ? `${v}:00+07:00` : v);
export const vnDue = (v, withYear = true) =>
  v
    ? new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", ...(withYear ? { year: "numeric" } : {}), hour12: false, timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(v))
    : "Chưa đặt";