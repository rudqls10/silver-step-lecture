import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Head from "next/head";
import type { NextPage } from "next";
import { useUser } from "@/context/UserContext";

/**
 * 메인 운동 화면(/) — 이번 범위(로그인+온보딩)에서는 사용자 정보 표시 + 로그아웃만 둔다.
 * 실제 Zero-Touch VUI 운동 화면은 별도 API 단계에서 구현.
 */
const Home: NextPage = () => {
  const router = useRouter();
  const { user, loading, signOut } = useUser();
  const [busy, setBusy] = useState(false);

  // 미로그인 보호
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  const handleLogout = async () => {
    setBusy(true);
    try {
      await signOut();
      router.replace("/login");
    } catch {
      setBusy(false);
    }
  };

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
