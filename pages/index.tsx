import type { NextPage } from "next";
import Head from "next/head";

/**
 * 메인 운동 화면(/) — 이번 범위(로그인+온보딩)에서는 stub만 둔다.
 * 실제 Zero-Touch VUI 운동 화면은 별도 API 단계에서 구현.
 */
const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>Silver Step (실버 스텝)</title>
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-3xl font-bold text-brand">Silver Step (실버 스텝)</h1>
        <p className="text-lg">
          살던 내 집에서 내 발로 안전하게, AI 낙상 예방 홈트레이닝
        </p>
        <p className="text-base text-gray-600">
          메인 운동 화면은 준비 중입니다.
        </p>
      </main>
    </>
  );
};

export default Home;
