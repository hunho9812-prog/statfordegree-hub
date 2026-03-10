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
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  // 이중 loadProfile 호출 방지용 ref
  const loadingProfileFor = useRef<string | null>(null);

  const loadProfile = useCallback(async (u: User) => {
    if (!supabase) return;
    // 동일 유저에 대해 이미 로딩 중이면 스킵
    if (loadingProfileFor.current === u.id) return;
    loadingProfileFor.current = u.id;

    try {
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

    // onAuthStateChange 하나만 사용 (INITIAL_SESSION 이벤트가 getSession() 역할을 함)
    // getSession() + onAuthStateChange를 둘 다 쓰면 loadProfile이 두 번 호출됨
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          await loadProfile(u);
        } else {
          setProfile(null);
          loadingProfileFor.current = null;
        }
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
