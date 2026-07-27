import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getSession, signOut as authSignOut, type SessionUser } from "@/lib/auth";
import { upsertProfile } from "@/lib/profileApi";
import { logActivity } from "@/lib/activity";

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
    refresh();
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
