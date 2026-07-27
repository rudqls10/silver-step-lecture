import { createContext, useContext, useState, type ReactNode } from "react";
import type { OnboardingData } from "@/lib/onboardingApi";

const empty: OnboardingData = {
  senior_name: "",
  guardian_name: "",
  gender: "",
  age: 0,
  height_cm: 0,
  weight_kg: 0,
  bmi: 0,
  chronic_diseases: [],
  fall_history: false,
  assistive_device: false,
  target_activity_level: 1,
  living_arrangement: "",
  guardian_email: "",
};

interface Ctx {
  step: number;
  setStep: (n: number) => void;
  data: OnboardingData;
  update: (patch: Partial<OnboardingData>) => void;
}

const OnboardingCtx = createContext<Ctx | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(empty);
  const update = (patch: Partial<OnboardingData>) => setData((d) => ({ ...d, ...patch }));
  return (
    <OnboardingCtx.Provider value={{ step, setStep, data, update }}>{children}</OnboardingCtx.Provider>
  );
}

export function useOnboarding() {
  const c = useContext(OnboardingCtx);
  if (!c) throw new Error("OnboardingProvider required");
  return c;
}
