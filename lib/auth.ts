import { getSupabase, APP_URL } from "./supabaseClient";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
}

/**
 * AGENTS.md §5: Google 로그인은 Supabase Auth 기준.
 * 로그인 후 Supabase 사용자 ID를 앱의 기본 사용자 식별자로 사용.
 */
export async function signInWithGoogle(): Promise<void> {
  const supabase = getSupabase();
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${APP_URL}/auth/callback` },
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  const u = data.session?.user;
  if (!u) return null;
  return {
    id: u.id,
    email: u.email ?? "",
    fullName: (u.user_metadata?.full_name as string) ?? u.email ?? "",
    avatarUrl:
      (u.user_metadata?.avatar_url as string) ??
      (u.user_metadata?.picture as string) ??
      undefined,
  };
}

export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  await supabase.auth.signOut();
}
