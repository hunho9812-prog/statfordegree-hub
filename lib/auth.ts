import { supabase } from "./supabase";

export const ADMIN_EMAIL = "rlagusgh1214@naver.com";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: "admin" | "member";
  created_at: string;
}

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error("Supabase가 설정되지 않았습니다.");
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();
  return data as UserProfile | null;
}

export async function getAllUsers(): Promise<UserProfile[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("users")
    .select("*")
    .order("created_at");
  return (data ?? []) as UserProfile[];
}
