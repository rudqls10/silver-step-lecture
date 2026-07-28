import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
// anon key 우선, 없으면 publishable key 호환 (키 이름 변형 대응)
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "";

// AGENTS.md §6 개정: DUMMY 모드 폐기. env 누락 시 조기 실패시킨다.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "[Silver Step] NEXT_PUBLIC_SUPABASE_URL / ANON KEY 가 설정되지 않았습니다. .env.local 을 확인하세요.",
  );
}

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

// 싱글톤: 호출마다 새 client를 만들면 PKCE code verifier / 세션 스토리지가
// 공유되지 않아 무한 리다이렉트가 발생합니다.
// flowType을 강제하지 않고 Supabase 기본값(implicit/해시 토큰)을 사용합니다.
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // PKCE flow: Supabase redirects to /auth/callback?code=... which we exchange.
    flowType: "pkce",
    persistSession: true,
    autoRefreshToken: true,
  },
});

export function getSupabase(): SupabaseClient {
  return supabase;
}
