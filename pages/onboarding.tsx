import { useRouter } from "next/router";
import { useEffect } from "react";
import Head from "next/head";
import type { NextPage } from "next";
import { useUser } from "@/context/UserContext";
import { OnboardingProvider, useOnboarding } from "@/context/OnboardingContext";
import OnboardingStep1 from "@/components/OnboardingStep1";
import OnboardingStep2 from "@/components/OnboardingStep2";
import OnboardingStep3 from "@/components/OnboardingStep3";
import OnboardingStep4 from "@/components/OnboardingStep4";
import OnboardingStep5 from "@/components/OnboardingStep5";

const Onboarding: NextPage = () => {
  const router = useRouter();
  const { user, loading } = useUser();

  // 보호 규칙: 미로그인 → /login
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-lg">불러오는 중...</p>
      </main>
    );
  }

  return (
    <>
      <Head>
        <title>온보딩 · Silver Step (실버 스텝)</title>
      </Head>
      <OnboardingProvider>
        <OnboardingInner userId={user.id} />
      </OnboardingProvider>
    </>
  );
};

function OnboardingInner({ userId }: { userId: string }) {
  const router = useRouter();
  const { step } = useOnboarding();
  return (
    <main className="mx-auto max-w-xl p-6">
      <ProgressBar step={step} />
      {step === 1 && <OnboardingStep1 />}
      {step === 2 && <OnboardingStep2 />}
      {step === 3 && <OnboardingStep3 />}
      {step === 4 && <OnboardingStep4 />}
      {step === 5 && <OnboardingStep5 userId={userId} onDone={() => router.replace("/")} />}
    </main>
  );
}

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="mb-6" aria-label={`${step} / 5 단계`}>
      <div className="mb-2 text-base text-gray-600">
        {step} / 5 단계
      </div>
      <div className="h-3 w-full rounded-full bg-gray-200">
        <div
          className="h-3 rounded-full bg-brand transition-all"
          style={{ width: `${(step / 5) * 100}%` }}
        />
      </div>
    </div>
  );
}

export default Onboarding;
