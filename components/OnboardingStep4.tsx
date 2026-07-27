import { useOnboarding } from "@/context/OnboardingContext";

/** Step 4: 보조기구 사용 여부 + 평균 활동량(1~4) */
export default function OnboardingStep4() {
  const { data, update, setStep } = useOnboarding();
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold">보행 능력 목표</h2>
      <label className="flex items-center gap-3 text-lg">
        <input
          type="checkbox"
          aria-label="보조기구 사용 여부"
          checked={data.assistive_device}
          onChange={(e) => update({ assistive_device: e.target.checked })}
        />
        보조기구(지팡이, 워커 등) 사용
      </label>
      <fieldset>
        <legend className="mb-2 text-lg">평균 활동량 (1: 적음 ~ 4: 많음)</legend>
        <div className="flex gap-3">
          {[1, 2, 3, 4].map((lv) => (
            <button
              key={lv}
              type="button"
              aria-pressed={data.target_activity_level === lv}
              onClick={() => update({ target_activity_level: lv })}
              className={`h-14 w-14 rounded-xl text-xl font-bold ${
                data.target_activity_level === lv
                  ? "bg-brand text-white"
                  : "border-2 border-gray-300 text-gray-700"
              }`}
            >
              {lv}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setStep(3)}
          className="rounded-2xl border-2 border-gray-300 px-6 py-4 text-lg"
        >
          이전
        </button>
        <button
          type="button"
          onClick={() => setStep(5)}
          className="flex-1 rounded-2xl bg-brand px-6 py-4 text-xl font-bold text-white"
        >
          다음
        </button>
      </div>
    </section>
  );
}
