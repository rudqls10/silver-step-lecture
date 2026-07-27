"use client";

interface Props {
  onClick: () => void;
  busy: boolean;
}

/** UI_REFERENCE: Google 로그인 버튼 (큰 글자, 고대비, 중복클릭 방지) */
export default function LoginButton({ onClick, busy }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label="Google 계정으로 로그인"
      className="w-full max-w-md rounded-2xl bg-brand px-6 py-4 text-xl font-bold text-white shadow-md transition hover:bg-brand-dark disabled:opacity-60"
    >
      {busy ? "로그인 중..." : "Google로 시작하기"}
    </button>
  );
}
