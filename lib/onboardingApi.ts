import { getSupabase } from "./supabaseClient";

/** DATA_MODEL §2 senior_health_profiles (신체/질환/보호자 정보) */
export interface OnboardingData {
  senior_name: string;
  guardian_name: string;
  gender: string;
  age: number;
  height_cm: number;
  weight_kg: number;
  bmi: number;
  chronic_diseases: string[];
  fall_history: boolean;
  assistive_device: boolean;
  target_activity_level: number;
  living_arrangement: string;
  guardian_email: string;
}

export async function saveOnboarding(userId: string, data: OnboardingData): Promise<void> {
  const supabase = getSupabase();

  // 기존 프로필 존재 여부 확인 (onConflict UNIQUE 제약조건 오류 방지)
  const { data: existing } = await supabase
    .from("senior_health_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  const payload = {
    user_id: userId,
    ...data,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    // 기존 데이터 존재 시 update
    const { error } = await supabase
      .from("senior_health_profiles")
      .update(payload)
      .eq("user_id", userId);
    if (error) {
      console.error("[saveOnboarding] Update Error:", error);
      throw error;
    }
  } else {
    // 신규 사용자 시 insert
    const { error } = await supabase
      .from("senior_health_profiles")
      .insert(payload);
    if (error) {
      console.error("[saveOnboarding] Insert Error:", error);
      throw error;
    }
  }
}

export async function getOnboarding(userId: string): Promise<OnboardingData | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("senior_health_profiles")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn("[getOnboarding] fetch error:", error);
  }
  return (data as OnboardingData) ?? null;
}

/** BMI 자동 계산: weight(kg) / (height(m))^2, 소수점 1자리 */
export function calcBmi(weight_kg: number, height_cm: number): number {
  if (!height_cm) return 0;
  return Math.round((weight_kg / (height_cm / 100) ** 2) * 10) / 10;
}
