import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import type { NextPage } from "next";
import { useUser } from "@/context/UserContext";
import { getSupabase } from "@/lib/supabaseClient";
import { getOnboarding } from "@/lib/onboardingApi";
import { WorkoutMain } from "@/components/workout/WorkoutMain";

/**
 * 메인 운동 화면(/) — 통합된 Silver Step AI 홈트레이닝 화면
 */
const Home: NextPage = () => {
  const router = useRouter();
  const { user, loading, signOut, refresh } = useUser();
  const [authChecked, setAuthChecked] = useState(false);
  const onboardingChecked = useRef(false);

  // 미로그인 보호 (OAuth callback 직후 race condition 방지)
  useEffect(() => {
    if (loading) return;
    if (user) {
      setAuthChecked(true);
      return;
    }

    // UserContext에 user가 없을 때 — Supabase 세션 직접 확인
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        refresh();
      } else {
        router.replace("/login");
      }
      setAuthChecked(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, router]);

  // 온보딩 미완료 보호: DB에서 실제 데이터 존재 여부를 항상 확인
  useEffect(() => {
    if (!authChecked || !user) return;
    if (onboardingChecked.current) return;
    onboardingChecked.current = true;

    getOnboarding(user.id).then((data) => {
      if (!data) {
        router.replace("/onboarding");
      }
    });
  }, [authChecked, user, router]);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch {
      /* ignore */
    }
  };

  if (loading || !authChecked || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFF9F2]">
        <p className="text-xl font-bold text-[#3D3028]">불러오는 중...</p>
      </main>
    );
  }

  return (
    <>
      <Head>
        <title>실버스텝 Silver Step - AI 홈트레이닝</title>
        <meta name="description" content="시니어를 위한 AI 홈트레이닝 코치" />
      </Head>

      <WorkoutMain user={user} onLogout={handleLogout} />
    </>
  );
};

export default Home;
