"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
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
  // loading = auth 세션 확인 중 (true → false가 최대한 빠르게)
  // profile 로드는 별도 비동기 → loading에 포함 안 함
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const loadingProfileFor = useRef<string | null>(null);

  const loadProfile = useCallback(async (u: User) => {
    if (!supabase) return;
    if (loadingProfileFor.current === u.id) return;
    loadingProfileFor.current = u.id;

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", u.id)
        .single();

      if (!error && data) {
        const profile = data as UserProfile;

        // 승인 대기 중인 계정 → 로그아웃
        if (profile.status === "pending") {
          setProfile(null);
          await supabase.auth.signOut();
          router.replace("/login?error=pending");
          return;
        }

        // 거절된 계정 → 로그아웃
        if (profile.status === "rejected") {
          setProfile(null);
          await supabase.auth.signOut();
          router.replace("/login?error=rejected");
          return;
        }

        setProfile(profile);
        return;
      }

      // public.users 레코드 없음 → 관리자 이메일이면 자동 생성
      if (u.email === ADMIN_EMAIL) {
        const { data: newProfile } = await supabase
          .from("users")
          .upsert({
            id: u.id,
            email: u.email!,
            name: (u.user_metadata?.name as string) ?? "",
            role: "admin",
            status: "approved",
          })
          .select()
          .single();
        setProfile(newProfile as UserProfile | null);
      } else {
        // 레코드 없는 일반 계정 → 로그아웃
        setProfile(null);
        await supabase.auth.signOut();
        router.replace("/login?error=unauthorized");
      }
    } finally {
      loadingProfileFor.current = null;
    }
  }, [router]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const u = session?.user ?? null;
        setUser(u);

        if (u) {
          // profile 로드는 백그라운드에서 (await 없음)
          // → loading을 DB 쿼리가 끝날 때까지 기다리지 않음
          loadProfile(u);
        } else {
          setProfile(null);
          loadingProfileFor.current = null;
        }

        // auth 세션 확인이 끝나면 즉시 loading 해제
        // profile은 비동기로 채워짐
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  async function handleSignOut() {
    setProfile(null);
    setUser(null);
    loadingProfileFor.current = null;
    if (supabase) await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  );
}
