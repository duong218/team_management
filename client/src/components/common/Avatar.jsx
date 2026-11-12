export default function Avatar({ name = "", size }) {
  const initials = name.trim().split(/\s+/).slice(-2).map((w) => w[0]).join("").toUpperCase() || "?";
  return <span className={`avatar ${size || ""}`} aria-hidden="true">{initials}</span>;
}
