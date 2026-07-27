import { getSupabase, IS_DUMMY, APP_URL } from "./supabaseClient";

const DUMMY_SESSION_KEY = "ss_session";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
}

function readDummy(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(DUMMY_SESSION_KEY);
  return raw ? (JSON.parse(raw) as SessionUser) : null;
}

function setDummy(user: SessionUser) {
  window.localStorage.setItem(DUMMY_SESSION_KEY, JSON.stringify(user));
}
function clearDummy() {
  window.localStorage.removeItem(DUMMY_SESSION_KEY);
}

/**
 * AGENTS.md §5: Google 로그인은 Supabase Auth 기준.
 * DB/env 미설정(DUMMY) 시 로컬 개발용 모킹 세션으로 대체.
 */
export async function signInWithGoogle(): Promise<void> {
  const supabase = getSupabase();
  if (IS_DUMMY || !supabase) {
    setDummy({
      id: "dummy-user-1",
      email: "demo@silverstep.dev",
      fullName: "시니어 데모",
    });
    if (typeof window !== "undefined") window.location.href = "/onboarding";
    return;
  }
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${APP_URL}/` },
  });
}

export async function getSession(): Promise<SessionUser | null> {
  if (IS_DUMMY) return readDummy();
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const u = data.session?.user;
  if (!u) return null;
  return {
    id: u.id,
    email: u.email ?? "",
    fullName: (u.user_metadata?.full_name as string) ?? u.email ?? "",
  };
}

export async function signOut(): Promise<void> {
  if (IS_DUMMY) {
    clearDummy();
    return;
  }
  const supabase = getSupabase();
  if (supabase) await supabase.auth.signOut();
}
