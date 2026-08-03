import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import type { NextPage } from 'next';
import { useUser } from '@/context/UserContext';
import { getSupabase } from '@/lib/supabaseClient';

// ──────────────────────────────────────────────────────────────
// AGENTS.md §7: /admin 은 서버 측 role = 'admin' 검증 필수
// 클라이언트는 Authorization: Bearer <access_token> 헤더 전송
// [보안 문제점 #1 해결] 세션에서 access_token 추출 후 API 헤더에 포함
// ──────────────────────────────────────────────────────────────

interface Stats {
  totalUsers: number;
  totalExercises: number;
  emailSent: number;
  emailFailed: number;
  highRiskCount: number;
}

interface ActivityLog {
  id: string;
  event_type: string;
  page_path: string | null;
  status: string | null;
  created_at: string;
}

interface DashboardData {
  stats: Stats;
  recentLogs: ActivityLog[];
}

const AdminPage: NextPage = () => {
  const router = useRouter();
  const { user, loading } = useUser();
  const [data, setData] = useState<DashboardData | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (loading) return;

    // 미로그인 → /login 이동
    if (!user) {
      router.replace('/login');
      return;
    }

    // ── [보안 문제점 #1 해결] ─────────────────────────────────
    // supabase.auth.getSession() 으로 access_token 을 추출해서
    // Authorization 헤더에 담아 API 로 전송합니다.
    // 서버 API Route 는 이 토큰으로 사용자를 검증합니다.
    const fetchDashboard = async () => {
      setIsFetching(true);
      setFetchError(null);

      const supabase = getSupabase();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        router.replace('/login');
        return;
      }

      try {
        const res = await fetch('/api/admin/dashboard', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (res.status === 403) {
          // AGENTS.md §7: 일반 사용자는 / 로 리다이렉트
          router.replace('/');
          return;
        }

        if (res.status === 401) {
          router.replace('/login');
          return;
        }

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setFetchError(body?.error ?? '데이터를 불러올 수 없습니다.');
          return;
        }

        const json: DashboardData = await res.json();
        setData(json);
      } catch {
        setFetchError('서버 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      } finally {
        setIsFetching(false);
      }
    };

    fetchDashboard();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  // ── 로딩 화면 ─────────────────────────────────────────────
  if (loading || isFetching || (!data && !fetchError)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto" />
          <p className="text-lg font-semibold text-gray-300">관제 데이터 로딩 중...</p>
        </div>
      </main>
    );
  }

  // ── 오류 화면 ─────────────────────────────────────────────
  if (fetchError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="text-center rounded-xl border border-red-700 bg-red-950/40 px-8 py-10">
          <p className="text-2xl font-bold text-red-400 mb-2">⚠ 접근 오류</p>
          <p className="text-gray-300">{fetchError}</p>
          <button
            id="admin-error-back-btn"
            onClick={() => router.push('/')}
            className="mt-6 rounded-lg bg-blue-600 px-6 py-2 text-white font-semibold hover:bg-blue-500 transition-colors"
          >
            메인으로 돌아가기
          </button>
        </div>
      </main>
    );
  }

  const { stats, recentLogs } = data!;
  const emailSuccessRate =
    stats.emailSent + stats.emailFailed > 0
      ? Math.round((stats.emailSent / (stats.emailSent + stats.emailFailed)) * 100)
      : 0;

  // ── 대시보드 UI ───────────────────────────────────────────
  return (
    <>
      <Head>
        <title>Silver Step 관리자 관제 대시보드</title>
        <meta name="description" content="B2B2G 기관용 노인 낙상 위험도 관제 및 ROI 리포트 대시보드" />
      </Head>

      <main className="min-h-screen bg-gray-950 text-gray-100">
        {/* 헤더 */}
        <header className="border-b border-gray-800 bg-gray-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛡</span>
            <div>
              <h1 className="text-xl font-bold text-white">Silver Step 관제 대시보드</h1>
              <p className="text-xs text-gray-400">B2B2G 기관용 노인 낙상 위험도 관제 시스템</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">
              {user?.fullName ?? user?.email} (관리자)
            </span>
            <button
              id="admin-home-btn"
              onClick={() => router.push('/')}
              className="rounded-lg border border-gray-600 px-4 py-1.5 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
            >
              메인으로
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">

          {/* 핵심 지표 카드 */}
          <section aria-label="핵심 지표">
            <h2 className="mb-4 text-lg font-semibold text-gray-200">📊 핵심 현황</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
              <StatCard
                id="stat-total-users"
                icon="👴"
                label="등록 시니어 수"
                value={stats.totalUsers}
                unit="명"
                color="blue"
              />
              <StatCard
                id="stat-total-exercises"
                icon="🏃"
                label="전체 운동 기록"
                value={stats.totalExercises}
                unit="건"
                color="green"
              />
              <StatCard
                id="stat-email-sent"
                icon="✉️"
                label="알림 발송 성공"
                value={stats.emailSent}
                unit="건"
                color="teal"
              />
              <StatCard
                id="stat-email-failed"
                icon="❌"
                label="알림 발송 실패"
                value={stats.emailFailed}
                unit="건"
                color="red"
              />
              <StatCard
                id="stat-high-risk"
                icon="⚠️"
                label="낙상 고위험 기록"
                value={stats.highRiskCount}
                unit="건"
                color="orange"
              />
            </div>
          </section>

          {/* 이메일 발송 성공률 */}
          <section aria-label="이메일 발송 통계">
            <h2 className="mb-4 text-lg font-semibold text-gray-200">📬 보호자 알림 발송 성공률</h2>
            <div className="rounded-xl border border-gray-700 bg-gray-900 p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-300 text-sm">발송 성공률</span>
                <span
                  id="email-success-rate"
                  className={`text-2xl font-bold ${
                    emailSuccessRate >= 90
                      ? 'text-green-400'
                      : emailSuccessRate >= 70
                      ? 'text-yellow-400'
                      : 'text-red-400'
                  }`}
                >
                  {emailSuccessRate}%
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-gray-700">
                <div
                  className={`h-3 rounded-full transition-all duration-700 ${
                    emailSuccessRate >= 90
                      ? 'bg-green-500'
                      : emailSuccessRate >= 70
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${emailSuccessRate}%` }}
                  role="progressbar"
                  aria-valuenow={emailSuccessRate}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`이메일 발송 성공률 ${emailSuccessRate}%`}
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                성공 {stats.emailSent}건 / 실패 {stats.emailFailed}건 (총 {stats.emailSent + stats.emailFailed}건)
              </p>
            </div>
          </section>

          {/* 최근 활동 로그 */}
          <section aria-label="최근 활동 로그">
            <h2 className="mb-4 text-lg font-semibold text-gray-200">📋 최근 활동 로그 (최근 10건)</h2>
            <div className="overflow-x-auto rounded-xl border border-gray-700 bg-gray-900">
              {recentLogs.length === 0 ? (
                <p className="p-8 text-center text-gray-500">기록된 활동 로그가 없습니다.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700 bg-gray-800">
                      <th className="px-4 py-3 text-left text-gray-400 font-medium">이벤트 타입</th>
                      <th className="px-4 py-3 text-left text-gray-400 font-medium">페이지</th>
                      <th className="px-4 py-3 text-left text-gray-400 font-medium">상태</th>
                      <th className="px-4 py-3 text-left text-gray-400 font-medium">시각</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLogs.map((log, idx) => (
                      <tr
                        key={log.id}
                        className={`border-b border-gray-800 hover:bg-gray-800/50 transition-colors ${
                          idx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-900/50'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <EventBadge eventType={log.event_type} />
                        </td>
                        <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                          {log.page_path ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          {log.status ? (
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                log.status === 'success'
                                  ? 'bg-green-900/50 text-green-400'
                                  : log.status === 'failed'
                                  ? 'bg-red-900/50 text-red-400'
                                  : 'bg-gray-700 text-gray-400'
                              }`}
                            >
                              {log.status}
                            </span>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {new Date(log.created_at).toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* 보안 안내 */}
          <footer className="rounded-xl border border-gray-800 bg-gray-900/50 px-6 py-4 text-xs text-gray-600">
            ⚠ 이 페이지는 관리자 전용입니다. 모든 데이터 조회는 서버 측 권한 검증을 거칩니다.
            개인정보(이메일, 전화번호 등)는 이 화면에 표시되지 않습니다.
          </footer>
        </div>
      </main>
    </>
  );
};

// ── 하위 컴포넌트 ─────────────────────────────────────────────

interface StatCardProps {
  id: string;
  icon: string;
  label: string;
  value: number;
  unit: string;
  color: 'blue' | 'green' | 'teal' | 'red' | 'orange';
}

function StatCard({ id, icon, label, value, unit, color }: StatCardProps) {
  const colorMap: Record<StatCardProps['color'], string> = {
    blue: 'border-blue-700 bg-blue-950/30',
    green: 'border-green-700 bg-green-950/30',
    teal: 'border-teal-700 bg-teal-950/30',
    red: 'border-red-700 bg-red-950/30',
    orange: 'border-orange-700 bg-orange-950/30',
  };
  const valueColorMap: Record<StatCardProps['color'], string> = {
    blue: 'text-blue-300',
    green: 'text-green-300',
    teal: 'text-teal-300',
    red: 'text-red-300',
    orange: 'text-orange-300',
  };

  return (
    <div
      id={id}
      className={`rounded-xl border p-4 ${colorMap[color]}`}
    >
      <div className="text-2xl mb-2">{icon}</div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${valueColorMap[color]}`}>
        {value.toLocaleString()}
        <span className="text-sm font-normal text-gray-400 ml-1">{unit}</span>
      </p>
    </div>
  );
}

function EventBadge({ eventType }: { eventType: string }) {
  const badges: Record<string, string> = {
    login: 'bg-blue-900/50 text-blue-300',
    logout: 'bg-gray-700 text-gray-300',
    page_view: 'bg-gray-800 text-gray-400',
    onboarding_complete: 'bg-purple-900/50 text-purple-300',
    exercise_started: 'bg-green-900/50 text-green-300',
    exercise_completed: 'bg-green-900/60 text-green-200',
    email_send_requested: 'bg-yellow-900/50 text-yellow-300',
    email_send_succeeded: 'bg-teal-900/50 text-teal-300',
    email_send_failed: 'bg-red-900/50 text-red-300',
    admin_view: 'bg-indigo-900/50 text-indigo-300',
    api_failed: 'bg-red-900/60 text-red-200',
  };
  const cls = badges[eventType] ?? 'bg-gray-800 text-gray-400';
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {eventType}
    </span>
  );
}

export default AdminPage;
