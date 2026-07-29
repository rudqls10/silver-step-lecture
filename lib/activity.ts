import { getSupabase } from "./supabaseClient";

/**
 * AGENTS.md §13 활동 로그. 이메일 본문/토큰/전체 응답은 절대 저장하지 않음.
 * 테이블이 아직 없을 수 있으므로 실패는 무시.
 */
export async function logActivity(
  event_type: string,
  meta: Record<string, unknown> = {},
): Promise<void> {
  const supabase = getSupabase();
  try {
    // RLS 정책: user_id = auth.uid() 이므로 반드시 포함해야 함
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("activity_logs").insert({
      user_id: user?.id ?? null,
      event_type,
      metadata: meta,
      status: "success",
    });
  } catch {
    /* activity_logs 미생성 상태면 무시 */
  }
}
