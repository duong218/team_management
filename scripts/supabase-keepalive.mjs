const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) throw new Error("Thiếu SUPABASE_URL hoặc SUPABASE_PUBLISHABLE_KEY");

const response = await fetch(`${url}/rest/v1/rpc/kiem_tra_ket_noi`, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  },
  body: "{}",
  signal: AbortSignal.timeout(15_000),
});

if (!response.ok || (await response.json()) !== true) {
  throw new Error(`Supabase keepalive thất bại (HTTP ${response.status})`);
}

console.log("Supabase keepalive thành công.");
