import { useOnboarding } from "@/context/OnboardingContext";

/** Step 1: 시니어 이름 + 자녀/보호자 이름 */
export default function OnboardingStep1() {
  const { data, update, setStep } = useOnboarding();
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold">이름을 알려주세요</h2>
      <label className="flex flex-col gap-2 text-lg">
        시니어 이름
        <input
          aria-label="시니어 이름"
          className="rounded-xl border-2 border-gray-300 p-3 text-lg"
          value={data.senior_name}
          onChange={(e) => update({ senior_name: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-2 text-lg">
        자녀 / 보호자 이름
        <input
          aria-label="자녀 보호자 이름"
          className="rounded-xl border-2 border-gray-300 p-3 text-lg"
          value={data.guardian_name}
          onChange={(e) => update({ guardian_name: e.target.value })}
        />
      </label>
      <button
        type="button"
        onClick={() => setStep(2)}
        className="rounded-2xl bg-brand px-6 py-4 text-xl font-bold text-white"
      >
        다음
      </button>
    </section>
  );
}
