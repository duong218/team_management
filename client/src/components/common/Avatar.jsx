import { useState } from "react";
export default function Avatar({ name = "", size, src }) {
  const [ok, setOk] = useState(true);
  const initials = name.trim().split(/\s+/).slice(-2).map((w) => w[0]).join("").toUpperCase() || "?";
  return (
    <span className={`avatar ${size || ""}`} aria-hidden="true">
      {src && ok ? <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setOk(false)} /> : initials}
    </span>
  );
}