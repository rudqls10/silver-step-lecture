import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import type { NextPage } from "next";
import { useUser } from "@/context/UserContext";
import { getSupabase } from "@/lib/supabaseClient";
import { getOnboarding } from "@/lib/onboardingApi";

/**
 * 메인 운동 화면(/) — 이번 범위(로그인+온보딩)에서는 사용자 정보 표시 + 로그아웃만 둔다.
 * 실제 Zero-Touch VUI 운동 화면은 별도 API 단계에서 구현.
 */
const Home: NextPage = () => {
  const router = useRouter();
  const { user, loading, signOut, refresh } = useUser();
  const [busy, setBusy] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  // 온보딩 가드: 최초 1회만 실행 (updateUser 후 세션 갱신으로 user가 교체될 때 재실행 방지)
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
        // 세션 존재 → UserContext 강제 갱신
        refresh();
      } else {
        router.replace("/login");
      }
      setAuthChecked(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, router]);

  // 온보딩 미완료 보호: DB에서 실제 데이터 존재 여부를 항상 확인
  // useRef로 1회만 실행하여 race condition 방지
  useEffect(() => {
    if (!authChecked || !user) return;
    // 이미 확인했으면 재실행하지 않음 (updateUser 후 user 교체 시 재실행 방지)
    if (onboardingChecked.current) return;
    onboardingChecked.current = true;

    // DB에서 실제 온보딩 데이터 존재 여부 확인 (metadata만으로는 DB 삭제 시 오탐 가능)
    getOnboarding(user.id).then((data) => {
      if (!data) {
        router.replace("/onboarding");
      }
    });
  }, [authChecked, user, router]);

  const handleLogout = async () => {
    setBusy(true);
    try {
      await signOut();
      // router.replace는 auth useEffect가 user=null을 감지 후 자동 처리
    } catch {
      setBusy(false);
    }
  };

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
        <title>Silver Step (실버 스텝)</title>
      </Head>
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 p-6 text-center">
        <section
          aria-label="로그인 사용자 정보"
          className="flex w-full flex-col items-center gap-3 rounded-2xl border border-gray-200 p-6"
        >
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={`${user.fullName} 프로필 사진`}
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <div
              aria-hidden
              className="flex h-20 w-20 items-center justify-center rounded-full bg-brand text-2xl font-bold text-white"
            >
              {(user.fullName || "님").slice(0, 1)}
            </div>
          )}
          <h2 className="text-2xl font-bold text-brand">{user.fullName}</h2>
          <p className="text-base text-gray-700">{user.email}</p>
        </section>

        <p className="text-lg">
          살던 내 집에서 내 발로 안전하게, AI 낙상 예방 홈트레이닝
        </p>
        <p className="text-base text-gray-600">
          메인 운동 화면은 준비 중입니다.
        </p>

        <button
          type="button"
          onClick={handleLogout}
          disabled={busy}
          aria-label="로그아웃"
          className="w-full max-w-md rounded-2xl bg-gray-700 px-6 py-4 text-xl font-bold text-white shadow-md transition hover:bg-gray-800 disabled:opacity-60"
        >
          {busy ? "로그아웃 중..." : "로그아웃"}
        </button>
      </main>
    </>
  );
};

export default Home;
