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

  const loadProfile = useCallback(
    async (u: User) => {
      if (!supabase) return;

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", u.id)
        .single();

      if (error || !data) {
        // 관리자 이메일이면 자동으로 users 테이블에 등록
        if (u.email === ADMIN_EMAIL) {
          const { data: newProfile } = await supabase
            .from("users")
            .insert({
              id: u.id,
              email: u.email,
              name: (u.user_metadata?.name as string) ?? "",
              role: "admin",
            })
            .select()
            .single();
          setProfile(newProfile as UserProfile);
        } else {
          // 초대받지 않은 사용자 → 로그아웃
          await supabase.auth.signOut();
          router.push("/login?error=unauthorized");
        }
      } else {
        setProfile(data as UserProfile);
      }
    },
    [router]
  );

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
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signOut: handleSignOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
