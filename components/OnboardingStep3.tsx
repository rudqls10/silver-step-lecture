import { useOnboarding } from "@/context/OnboardingContext";

const DISEASES = ["근골격계", "심뇌혈관", "호흡기계", "대사계", "기타"];

/** Step 3: 질환 태그 + 최근 낙상 이력 */
export default function OnboardingStep3() {
  const { data, update, setStep } = useOnboarding();
  const toggle = (d: string) => {
    const has = data.chronic_diseases.includes(d);
    update({
      chronic_diseases: has
        ? data.chronic_diseases.filter((x) => x !== d)
        : [...data.chronic_diseases, d],
    });
  };

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold">질환 및 낙상 이력</h2>
      <fieldset>
        <legend className="mb-2 text-lg">만성질환 태그</legend>
        <div className="flex flex-wrap gap-3">
          {DISEASES.map((d) => {
            const active = data.chronic_diseases.includes(d);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(d)}
                className={`rounded-full px-5 py-3 text-lg ${
                  active ? "bg-brand text-white" : "border-2 border-gray-300 text-gray-700"
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </fieldset>
      <label className="flex items-center gap-3 text-lg">
        <input
          type="checkbox"
          aria-label="최근 낙상 이력"
          checked={data.fall_history}
          onChange={(e) => update({ fall_history: e.target.checked })}
        />
        최근 1년 내 낙상 이력 있음
      </label>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setStep(2)}
          className="rounded-2xl border-2 border-gray-300 px-6 py-4 text-lg"
        >
          이전
        </button>
        <button
          type="button"
          onClick={() => setStep(4)}
          className="flex-1 rounded-2xl bg-brand px-6 py-4 text-xl font-bold text-white"
        >
          다음
        </button>
      </div>
    </section>
  );
}
