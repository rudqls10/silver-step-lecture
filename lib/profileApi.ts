import { getSupabase, IS_DUMMY } from "./supabaseClient";
import type { SessionUser } from "./auth";

/**
 * profiles 테이블 upsert (AGENTS.md §5 / DATA_MODEL §1)
 * id = auth.users.id, email/name/role만 저장. email은 PK 아님.
 */
export async function upsertProfile(user: SessionUser): Promise<void> {
  if (IS_DUMMY) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        `ss_profile_${user.id}`,
        JSON.stringify({ id: user.id, email: user.email, full_name: user.fullName, role: "user" }),
      );
    }
    return;
  }
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email,
    full_name: user.fullName,
    role: "user",
  });
}
