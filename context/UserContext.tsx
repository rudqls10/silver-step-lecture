import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getSession, signOut as authSignOut, type SessionUser } from "@/lib/auth";
import { upsertProfile } from "@/lib/profileApi";
import { logActivity } from "@/lib/activity";
import { getSupabase } from "@/lib/supabaseClient";

interface UserCtx {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<UserCtx>({
  user: null,
  loading: true,
  refresh: async () => {},
  signOut: async () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const loggedIds = useRef<Set<string>>(new Set());

  const refresh = async () => {
    setLoading(true);
    setUser(await getSession());
    setLoading(false);
  };

  useEffect(() => {
    // 초기 세션 로드
    refresh();

    // 세션 변경 실시간 감지 (callback 교환 완료 시 즉시 반영)
    const supabase = getSupabase();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "SIGNED_OUT") {
          const session = await getSession();
          setUser(session);
          setLoading(false);
        }
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 세션 확보 시 프로필 동기화 + login 로그 (OAuth 콜백/더미 모두 동일 경로)
  useEffect(() => {
    if (user && !loggedIds.current.has(user.id)) {
      loggedIds.current.add(user.id);
      upsertProfile(user).catch(() => {});
      logActivity("login", { email: user.email }).catch(() => {});
    }
  }, [user]);

  const signOut = async () => {
    await logActivity("logout").catch(() => {});
    await authSignOut();
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, refresh, signOut }}>{children}</Ctx.Provider>;
}

export const useUser = () => useContext(Ctx);
