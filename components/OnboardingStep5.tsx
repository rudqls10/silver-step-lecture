import { useState } from "react";
import { useOnboarding } from "@/context/OnboardingContext";
import { saveOnboarding, calcBmi } from "@/lib/onboardingApi";
import { logActivity } from "@/lib/activity";

/** Step 5: 거주 형태 + 자녀 Gmail 주소 → 저장 후 메인 이동 */
export default function OnboardingStep5({
  userId,
  onDone,
}: {
  userId: string;
  onDone: () => void;
}) {
  const { data, update, setStep } = useOnboarding();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.guardian_email);

  const handleSubmit = async () => {
    if (!validEmail) {
      setError("올바른 Gmail 주소를 입력해 주세요.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = { ...data, bmi: calcBmi(data.weight_kg, data.height_cm) };
      await saveOnboarding(userId, payload);
      await logActivity("onboarding_complete").catch(() => {});
      onDone();
    } catch {
      setError("저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      setSaving(false);
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold">마지막 단계</h2>
      <label className="flex flex-col gap-2 text-lg">
        거주 형태
        <select
          aria-label="거주 형태"
          className="rounded-xl border-2 border-gray-300 p-3 text-lg"
          value={data.living_arrangement}
          onChange={(e) => update({ living_arrangement: e.target.value })}
        >
          <option value="">선택</option>
          <option value="독거">혼자 거주</option>
          <option value="동거">가족과 동거</option>
          <option value="요양시설">요양 시설</option>
        </select>
      </label>
      <label className="flex flex-col gap-2 text-lg">
        자녀 / 보호자 Gmail 주소
        <input
          type="email"
          aria-label="보호자 Gmail 주소"
          className="rounded-xl border-2 border-gray-300 p-3 text-lg"
          value={data.guardian_email}
          onChange={(e) => update({ guardian_email: e.target.value })}
        />
      </label>
      {error && (
        <p role="alert" className="text-lg text-red-600">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setStep(4)}
          className="rounded-2xl border-2 border-gray-300 px-6 py-4 text-lg"
        >
          이전
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1 rounded-2xl bg-brand px-6 py-4 text-xl font-bold text-white disabled:opacity-60"
        >
          {saving ? "저장 중..." : "완료하기"}
        </button>
      </div>
    </section>
  );
}
