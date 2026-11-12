export function validateHttps(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && url.length <= 2000 && !/\s/.test(url);
  } catch {
    return false;
  }
}
export function validateReason(s) {
  return String(s || "").trim().length >= 10;
}
export function validateTitle(s, max = 200) {
  return String(s || "").trim().length > 0 && String(s).length <= max;
}
