import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import type { NextPage } from "next";
import { getSupabase } from "@/lib/supabaseClient";
import { getOnboarding } from "@/lib/onboardingApi";

/**
 * 온보딩 완료 여부 판단: DB(senior_health_profiles) 데이터 존재 여부만으로 판단.
 * user_metadata는 JWT 캐시 문제로 신뢰하지 않음.
 */
async function checkOnboarded(userId: string): Promise<boolean> {
  const data = await getOnboarding(userId);
  return data !== null;
}

/**
 * /auth/callback — Google OAuth 처리 페이지
 *
 * detectSessionInUrl: true 설정으로 Supabase가 URL의 ?code= 를 자동 감지·교환.
 * 이 페이지는 onAuthStateChange 이벤트를 기다렸다가 온보딩 여부에 따라 리다이렉트.
 */
const AuthCallback: NextPage = () => {
  const router = useRouter();
  const [error, setError] = useState("");
  const redirected = useRef(false);

  useEffect(() => {
    const supabase = getSupabase();

    const redirect = async (userId: string) => {
      if (redirected.current) return;
      redirected.current = true;
      const onboarded = await checkOnboarded(userId);
      router.replace(onboarded ? "/" : "/onboarding");
    };

    // detectSessionInUrl: true → Supabase가 URL code를 자동 교환 후 SIGNED_IN 이벤트 발생
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          await redirect(session.user.id);
        }
      },
    );

    // 이미 세션이 존재하는 경우 (페이지 새로고침 등)
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        await redirect(data.session.user.id);
      }
    });

    // 10초 내에 SIGNED_IN이 오지 않으면 에러 처리
    const timeout = setTimeout(() => {
      if (!redirected.current) {
        setError("로그인 처리에 실패했습니다. 다시 시도해 주세요.");
        setTimeout(() => router.replace("/login"), 2000);
      }
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <>
      <Head>
        <title>로그인 처리 중 · Silver Step (실버 스텝)</title>
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        {error ? (
          <p role="alert" className="text-lg text-red-600">
            {error}
          </p>
        ) : (
          <p className="text-lg text-gray-700">로그인 처리 중입니다...</p>
        )}
      </main>
    </>
  );
};

export default AuthCallback;
