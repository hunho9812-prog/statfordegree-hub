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
  const loadingProfileFor = useRef<string | null>(null);

  const loadProfile = useCallback(async (u: User) => {
    if (!supabase) return;
    if (loadingProfileFor.current === u.id) return;
    loadingProfileFor.current = u.id;

    try {
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .eq("id", u.id)
        .single();

      if (!error && data) {
        const existingProfile = data as UserProfile;
        // 관리자 이메일이면 항상 admin role 강제 적용
        if (u.email === ADMIN_EMAIL) {
          setProfile({ ...existingProfile, role: "admin" });
        } else {
          setProfile(existingProfile);
        }
        return;
      }

      // team_members 레코드 없음
      if (u.email === ADMIN_EMAIL) {
        // 관리자 이메일이면 임시 프로필로 접근 허용
        setProfile({
          id: u.id,
          email: u.email!,
          name: (u.user_metadata?.name as string) ?? "관리자",
          role: "admin",
          joined_at: new Date().toISOString(),
        });
        return;
      }

      // team_members에 없는 일반 계정 → 미승인 → 로그아웃
      setProfile(null);
      await supabase.auth.signOut();
      router.replace("/login?error=unauthorized");
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
          loadProfile(u);
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
