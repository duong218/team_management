import { useEffect, useState } from "react";
// Số chạy từ 0 lên giá trị thật. Nhận số hoặc chuỗi như "3/7", "14%": mỗi cụm chữ số tự đếm lên. Người bật giảm chuyển động thấy số ngay.
const still = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
export default function CountUp({ value, ms = 900 }) {
  const text = String(value ?? ""), [st, setSt] = useState({ text: "", p: 0 });
  useEffect(() => {
    if (!/\d/.test(text) || still()) return;
    let raf, t0;
    const tick = (now) => {
      t0 ??= now;
      const x = Math.min(1, (now - t0) / ms);
      setSt({ text, p: 1 - (1 - x) ** 3 });
      if (x < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, ms]);
  const p = !/\d/.test(text) || still() ? 1 : st.text === text ? st.p : 0;
  return text.replace(/\d+/g, (n) => String(Math.round(Number(n) * p)));
}