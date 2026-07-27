import { getSupabase, IS_DUMMY } from "./supabaseClient";

/**
 * AGENTS.md §13 활동 로그. 이메일 본문/토큰/전체 응답은 절대 저장하지 않음.
 * 테이블이 아직 없을 수 있으므로 실패는 무시(교육용 규칙 §6 더미 폴백).
 */
export async function logActivity(event_type: string, meta: Record<string, unknown> = {}): Promise<void> {
  if (IS_DUMMY) return;
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from("activity_logs").insert({
      event_type,
      metadata: meta,
      status: "success",
    });
  } catch {
    /* activity_logs 미생성 상태면 무시 */
  }
}
