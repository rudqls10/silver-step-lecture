import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Head from "next/head";
import type { NextPage } from "next";
import { getSupabase } from "@/lib/supabaseClient";

const AuthCallback: NextPage = () => {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getSupabase();
      // PKCE flow: Supabase redirects to /auth/callback?code=...
      const params = new URLSearchParams(window.location.search);
      const code =
        params.get("code") ||
        new URLSearchParams(window.location.hash.replace(/^#/, "")).get("code") ||
        "";
      if (!code) {
        if (!cancelled) {
          setError("로그인 처리에 실패했습니다. 다시 시도해 주세요.");
          setTimeout(() => router.replace("/login"), 1500);
        }
        return;
      }
      try {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (exchangeError) {
          // 실제 에러 메시지를 노출하여 Vercel/로컬 환경 차이 진단
          // eslint-disable-next-line no-console
          console.error("[AuthCallback] exchangeCodeForSession failed:", exchangeError);
          setError(`로그인 처리에 실패했습니다: ${exchangeError.message}`);
          setTimeout(() => router.replace("/login"), 4000);
          return;
        }
        const { data } = await supabase.auth.getSession();
        const isOnboarded = data.session?.user?.user_metadata?.onboarded === true;
        router.replace(isOnboarded ? "/" : "/onboarding");
      } catch {
        if (!cancelled) {
          setError("로그인 처리 중 오류가 발생했습니다. 다시 시도해 주세요.");
          setTimeout(() => router.replace("/login"), 1500);
        }
      }
    })();

    return () => {
      cancelled = true;
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
