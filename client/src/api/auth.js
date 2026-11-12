import { supabase } from "../supabase";
export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error("Không thể kiểm tra phiên đăng nhập.");
  return data.session?.user ?? null;
};
export const watchAuth = (cb) =>
  supabase.auth.onAuthStateChange((_e, s) => cb(s?.user ?? null));
export const signIn = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
  if (error) throw new Error("Không thể đăng nhập Google: " + error.message);
};
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error("Không thể đăng xuất: " + error.message);
};
