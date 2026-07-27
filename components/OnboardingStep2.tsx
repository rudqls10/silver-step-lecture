import { useOnboarding } from "@/context/OnboardingContext";
import { calcBmi } from "@/lib/onboardingApi";

/** Step 2: 성별/연령/신장/체중 → BMI 자동 계산 (cm→m 주의) */
export default function OnboardingStep2() {
  const { data, update, setStep } = useOnboarding();
  const bmi = calcBmi(data.weight_kg, data.height_cm);

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold">신체 기초 정보</h2>
      <label className="flex flex-col gap-2 text-lg">
        성별
        <select
          aria-label="성별"
          className="rounded-xl border-2 border-gray-300 p-3 text-lg"
          value={data.gender}
          onChange={(e) => update({ gender: e.target.value })}
        >
          <option value="">선택</option>
          <option value="남">남</option>
          <option value="여">여</option>
        </select>
      </label>
      <label className="flex flex-col gap-2 text-lg">
        연령
        <input
          type="number"
          aria-label="연령"
          className="rounded-xl border-2 border-gray-300 p-3 text-lg"
          value={data.age || ""}
          onChange={(e) => update({ age: Number(e.target.value) })}
        />
      </label>
      <label className="flex flex-col gap-2 text-lg">
        신장 (cm)
        <input
          type="number"
          aria-label="신장"
          className="rounded-xl border-2 border-gray-300 p-3 text-lg"
          value={data.height_cm || ""}
          onChange={(e) => update({ height_cm: Number(e.target.value) })}
        />
      </label>
      <label className="flex flex-col gap-2 text-lg">
        체중 (kg)
        <input
          type="number"
          aria-label="체중"
          className="rounded-xl border-2 border-gray-300 p-3 text-lg"
          value={data.weight_kg || ""}
          onChange={(e) => update({ weight_kg: Number(e.target.value) })}
        />
      </label>
      <p aria-live="polite" className="text-lg text-brand-dark">
        자동 계산 BMI: {bmi || "-"}
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="rounded-2xl border-2 border-gray-300 px-6 py-4 text-lg"
        >
          이전
        </button>
        <button
          type="button"
          onClick={() => setStep(3)}
          className="flex-1 rounded-2xl bg-brand px-6 py-4 text-xl font-bold text-white"
        >
          다음
        </button>
      </div>
    </section>
  );
}
