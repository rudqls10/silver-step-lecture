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
// detectSessionInUrl:false → 클라이언트가 URL의 ?code= 를 자동 교환하지 않음.
// (콜백 페이지에서 exchangeCodeForSession(code) 을 단일 호출하므로 중복 교환/verifier 소모 방지)
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // PKCE flow: Supabase redirects to /auth/callback?code=... which we exchange.
    flowType: "pkce",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export function getSupabase(): SupabaseClient {
  return supabase;
}
