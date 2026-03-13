import { supabase } from "./supabase";

export const ADMIN_EMAIL = "rlagusgh1214@naver.com";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: "admin" | "member";
  joined_at: string;
}

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error("Supabase가 설정되지 않았습니다.");
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
