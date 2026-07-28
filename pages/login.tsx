import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Head from "next/head";
import type { NextPage } from "next";
import { signInWithGoogle } from "@/lib/auth";
import { useUser } from "@/context/UserContext";
import LoginButton from "@/components/LoginButton";
import { getOnboarding } from "@/lib/onboardingApi";

const Login: NextPage = () => {
  const router = useRouter();
  const { user, loading } = useUser();
  const [busy, setBusy] = useState(false);
  const [coachMode, setCoachMode] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) return;
    if (user) {
      // 이미 온보딩 완료면 메인, 아니면 온보딩
      getOnboarding(user.id).then((o) => router.replace(o ? "/" : "/onboarding"));
    }
  }, [loading, user, router]);

  const handleLogin = async () => {
    setBusy(true);
    setError("");
    try {
      await signInWithGoogle();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[Login] signInWithGoogle failed:", e);
      const msg = e instanceof Error ? e.message : String(e);
      setError(`로그인에 실패했습니다: ${msg}`);
      setBusy(false);
    }
  };

  return (
    <>
      <Head>
        <title>로그인 · Silver Step (실버 스텝)</title>
      </Head>
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-8 p-6 text-center">
        <div>
          <h1 className="text-3xl font-bold text-brand">Silver Step (실버 스텝)</h1>
          <p className="mt-3 text-lg">
            살던 내 집에서 내 발로 안전하게, AI 낙상 예방 홈트레이닝
          </p>
        </div>

        <LoginButton onClick={handleLogin} busy={busy} />
        {error && (
          <p role="alert" className="text-lg text-red-600">
            {error}
          </p>
        )}

        {/* UI_REFERENCE: 방문 코치 대행 세팅 모드 (UI만, 권한 로직은 미정의) */}
        <label className="mt-2 flex items-center gap-2 text-base text-gray-700">
          <input
            type="checkbox"
            aria-label="방문 코치 대행 세팅 모드"
            checked={coachMode}
            onChange={(e) => setCoachMode(e.target.checked)}
          />
          방문 코치가 대신 세팅하기
        </label>

        <p className="mt-4 max-w-md text-sm leading-relaxed text-gray-500">
          촬영 영상은 저장하지 않고, 관절 좌표만 안전하게 처리합니다. 최소 정보만
          수집합니다.
        </p>
      </main>
    </>
  );
};

export default Login;
