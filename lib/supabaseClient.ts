import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * AGENTS.md §6: DB가 없다면 더미데이터를 사용한다.
 * env 미설정 시 IS_DUMMY=true 로 전환하고 getSupabase()는 null 반환.
 * 이때 데이터 레이어는 로컬 더미 저장소로 폴백해야 한다.
 */
export const IS_DUMMY = !supabaseUrl || !supabaseAnonKey;

let client: SupabaseClient | null = null;
if (!IS_DUMMY) {
  client = createClient(supabaseUrl as string, supabaseAnonKey as string);
}

export function getSupabase(): SupabaseClient | null {
  return client;
}

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

if (IS_DUMMY) {
  // eslint-disable-next-line no-console
  console.warn(
    "[Silver Step] NEXT_PUBLIC_SUPABASE_* 미설정: DUMMY 모드로 동작합니다.",
  );
}
