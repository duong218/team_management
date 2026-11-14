import { Children, useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import "../../styles/select.css";

/* Ô chọn gọn gàng thay cho <select>: dùng y hệt (value, defaultValue, onChange(e.target.value), <option>, disabled, id).
   Danh sách thả xuống nằm ngay dưới ô, tự cuộn khi dài, tự mở lên trên nếu dưới không đủ chỗ, không tràn khỏi khung. */
export default function Select({ value, defaultValue = "", onChange, children, disabled, id, name, className = "" }) {
  const [inner, setInner] = useState(defaultValue),
    [open, setOpen] = useState(false),
    [up, setUp] = useState(false),
    box = useRef(null),
    list = useRef(null),
    current = String(value ?? inner),
    options = Children.toArray(children)
      .filter((c) => c?.props)
      .map((c) => ({ value: String(c.props.value ?? ""), label: Children.toArray(c.props.children).join(""), disabled: !!c.props.disabled }))
      .filter((o) => !(o.value === "" && o.disabled)), // dòng gợi ý "Chọn…" bị khóa chỉ để làm chữ mờ trong ô
    allOptions = Children.toArray(children).filter((c) => c?.props),
    shown = allOptions.find((c) => String(c.props.value ?? "") === current),
    text = shown ? Children.toArray(shown.props.children).join("") : "",
    empty = current === "";
  useEffect(() => {
    if (!open) return;
    const away = (e) => !box.current?.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);
  useEffect(() => {
    if (open) (list.current?.querySelector('[aria-selected="true"]') || list.current?.querySelector("button:not(:disabled)"))?.focus();
  }, [open]);
  function toggle() {
    if (disabled) return;
    if (!open) {
      const r = box.current.getBoundingClientRect(), below = window.innerHeight - r.bottom;
      setUp(below < 280 && r.top > below);
    }
    setOpen((o) => !o);
  }
  function pick(v) {
    setInner(v);
    setOpen(false);
    onChange?.({ target: { value: v, name, id } });
    box.current?.querySelector(".sx-btn")?.focus();
  }
  function keys(e) {
    const items = [...list.current.querySelectorAll("button:not(:disabled)")], i = items.indexOf(document.activeElement);
    if (e.key === "Escape") { e.preventDefault(); setOpen(false); box.current.querySelector(".sx-btn").focus(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); items[Math.min(i + 1, items.length - 1)]?.focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); items[Math.max(i - 1, 0)]?.focus(); }
    else if (e.key === "Home") { e.preventDefault(); items[0]?.focus(); }
    else if (e.key === "End") { e.preventDefault(); items[items.length - 1]?.focus(); }
    else if (e.key === "Tab") setOpen(false);
  }
  return (
    <span className={`sx ${className}`} ref={box}>
      <input type="hidden" id={id} name={name} value={current} readOnly />
      <button type="button" className={`sx-btn${empty ? " is-empty" : ""}`} disabled={disabled} aria-haspopup="listbox" aria-expanded={open}
        onClick={toggle} onKeyDown={(e) => { if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) { e.preventDefault(); toggle(); } }}>
        <span className="sx-text">{text || "Chọn…"}</span>
        <ChevronDown size={18} aria-hidden="true" className="sx-chev" />
      </button>
      {open && (
        <div className={`sx-pop${up ? " up" : ""}`} role="listbox" ref={list} onKeyDown={keys}>
          {options.map((o) => (
            <button key={o.value} type="button" role="option" aria-selected={o.value === current} disabled={o.disabled} className="sx-opt" onClick={() => pick(o.value)}>
              <span>{o.label}</span>
              {o.value === current && o.value !== "" ? <Check size={16} aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}