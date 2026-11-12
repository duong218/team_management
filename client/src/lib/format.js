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
