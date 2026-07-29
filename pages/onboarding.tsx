import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Head from "next/head";
import type { NextPage } from "next";
import { useUser } from "@/context/UserContext";
import { getSupabase } from "@/lib/supabaseClient";
import { OnboardingProvider, useOnboarding } from "@/context/OnboardingContext";
import OnboardingStep1 from "@/components/OnboardingStep1";
import OnboardingStep2 from "@/components/OnboardingStep2";
import OnboardingStep3 from "@/components/OnboardingStep3";
import OnboardingStep4 from "@/components/OnboardingStep4";
import OnboardingStep5 from "@/components/OnboardingStep5";

const Onboarding: NextPage = () => {
  const router = useRouter();
  const { user, loading, refresh } = useUser();
  const [authChecked, setAuthChecked] = useState(false);

  // 보호 규칙: 미로그인 → /login
  // OAuth callback 직후 UserContext가 아직 동기화되지 않았을 수 있으므로
  // Supabase 세션을 직접 확인하여 race condition 방지
  useEffect(() => {
    if (loading) return;
    if (user) {
      setAuthChecked(true);
      return;
    }

    // UserContext에 user가 없지만 세션이 존재할 수 있음
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        // 세션 존재 → UserContext 강제 갱신 (onAuthStateChange가 아직 처리 안 됨)
        refresh();
      } else {
        // 세션 없음 → 미로그인
        router.replace("/login");
      }
      setAuthChecked(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, router]);

  if (loading || !authChecked || !user) {
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
  const { user, signOut } = useUser();
  const { step } = useOnboarding();

  const handleLogout = async () => {
    await signOut();
    // router.replace는 auth useEffect가 user=null 감지 후 자동 처리
  };

  return (
    <main className="mx-auto max-w-xl p-6">
      {/* 현재 로그인 사용자 정보 + 로그아웃 */}
      <div className="mb-4 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2 text-sm text-gray-600">
        <span>
          {user?.email ?? ""}로 로그인됨
        </span>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md bg-gray-200 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-300 transition"
        >
          로그아웃
        </button>
      </div>
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
