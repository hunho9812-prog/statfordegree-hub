"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { ADMIN_EMAIL, type UserProfile } from "@/lib/auth";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadProfile = useCallback(async (u: User) => {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", u.id)
      .single();

    if (!error && data) {
      setProfile(data as UserProfile);
      return;
    }

    // public.users 레코드 없음 → 자동 생성 시도
    // admin 이메일이거나, 초대 메타데이터(role)가 있는 경우만 허용
    const role: "admin" | "member" | null =
      u.email === ADMIN_EMAIL
        ? "admin"
        : (u.user_metadata?.role as "admin" | "member" | undefined) ?? null;

    if (role) {
      const { data: newProfile } = await supabase
        .from("users")
        .upsert({
          id: u.id,
          email: u.email!,
          name: (u.user_metadata?.name as string) ?? "",
          role,
        })
        .select()
        .single();
      setProfile(newProfile as UserProfile | null);
    } else {
      // 초대받지 않은 계정 → 로그아웃
      setProfile(null);
      await supabase.auth.signOut();
      router.replace("/login?error=unauthorized");
    }
  }, [router]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    // 초기 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        loadProfile(u).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // 인증 상태 변경 구독
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        await loadProfile(u);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  async function handleSignOut() {
    setProfile(null);
    setUser(null);
    if (supabase) await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  );
}
