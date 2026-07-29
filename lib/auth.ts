import { getSupabase } from "./supabaseClient";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  isOnboarded: boolean;
}

/** 브라우저 현재 origin 기반으로 콜백 URL 생성 (localhost/Vercel 모두 정확) */
function getCallbackUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/auth/callback`;
  }
  return "/auth/callback";
}

/**
 * AGENTS.md §5: Google 로그인은 Supabase Auth 기준.
 * 로그인 후 Supabase 사용자 ID를 앱의 기본 사용자 식별자로 사용.
 */
export async function signInWithGoogle(): Promise<void> {
  const supabase = getSupabase();
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getCallbackUrl(),
      // 매번 계정 선택 화면을 강제 표시 → 로그아웃 후 다른 계정 선택 가능
      queryParams: { prompt: "select_account" },
    },
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
    isOnboarded: u.user_metadata?.onboarded === true,
  };
}

export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  await supabase.auth.signOut();
}
