import { getSupabase, IS_DUMMY } from "./supabaseClient";

/**
 * DATA_MODEL §2 senior_health_profiles (신체/질환/보호자 정보)
 * profiles와 분리 저장 (결정 Q4).
 */
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
  if (IS_DUMMY) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`ss_onboarding_${userId}`, JSON.stringify({ ...data, user_id: userId }));
    }
    return;
  }
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from("senior_health_profiles").upsert({
    user_id: userId,
    ...data,
  });
}

export async function getOnboarding(userId: string): Promise<OnboardingData | null> {
  if (IS_DUMMY) {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(`ss_onboarding_${userId}`);
    return raw ? (JSON.parse(raw) as OnboardingData) : null;
  }
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase
    .from("senior_health_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();
  return (data as OnboardingData) ?? null;
}

/** BMI 자동 계산: weight(kg) / (height(m))^2, 소수점 1자리 */
export function calcBmi(weight_kg: number, height_cm: number): number {
  if (!height_cm) return 0;
  return Math.round((weight_kg / (height_cm / 100) ** 2) * 10) / 10;
}
