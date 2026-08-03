import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// ──────────────────────────────────────────────────────────────
// 보안 원칙 (AGENTS.md §6 §7)
// 1. Authorization 헤더 Bearer 토큰으로 사용자 JWT 검증 (문제점 #1 해결)
// 2. DB profiles.role 을 서버에서 직접 재확인 (문제점 #2 해결)
// 3. 데이터 Row 대신 count 만 조회 (문제점 #3 해결)
// 4. SUPABASE_SERVICE_ROLE_KEY 는 절대 클라이언트에 노출하지 않음
// ──────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET 만 허용
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // ── 1. Authorization 헤더에서 Bearer 토큰 추출 ────────────────
  // [보안 문제점 #1 해결] 클라이언트는 getSession() 후 access_token 을
  // 'Authorization: Bearer <token>' 헤더에 담아 전송해야 합니다.
  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return res.status(401).json({ error: '인증 토큰이 없습니다.' });
  }

  // ── 2. anon 클라이언트로 JWT 토큰을 직접 검증 ───────────────
  // [보안 문제점 #2 해결 - 1단계] 위변조된 토큰 차단
  const anonClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: userData, error: userError } = await anonClient.auth.getUser(token);

  if (userError || !userData?.user) {
    return res.status(401).json({ error: '유효하지 않은 인증 토큰입니다.' });
  }

  const userId = userData.user.id;

  // ── 3. SERVICE_ROLE_KEY 로 profiles.role 검증 ─────────────────
  // [보안 문제점 #2 해결 - 2단계] DB 에서 직접 role 확인
  // Service Role Client 는 서버 전용 — 클라이언트에 절대 노출하지 않음
  if (!SERVICE_ROLE_KEY) {
    console.error('[admin/dashboard] SUPABASE_SERVICE_ROLE_KEY 가 설정되지 않았습니다.');
    return res.status(500).json({ error: '서버 설정 오류입니다.' });
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (profileError || !profile) {
    return res.status(403).json({ error: '권한 정보를 확인할 수 없습니다.' });
  }

  if (profile.role !== 'admin') {
    // AGENTS.md §7: 일반 사용자의 /admin 접근 차단
    return res.status(403).json({ error: '관리자 권한이 없습니다.' });
  }

  // ── 4. 대시보드 집계 쿼리 (count 만 조회) ────────────────────
  // [보안 문제점 #3 해결] { count: 'exact', head: true } 로
  // 실제 Row 데이터 전송 없이 카운트만 가져옴 → 성능·비용 최적화
  try {
    // 4-1. 전체 시니어(user) 등록 수
    const { count: totalUsers, error: usersErr } = await adminClient
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'user');

    // 4-2. 전체 운동 기록 수
    const { count: totalExercises, error: exercisesErr } = await adminClient
      .from('exercise_logs')
      .select('id', { count: 'exact', head: true });

    // 4-3. 이메일 발송 성공 수
    const { count: emailSent, error: sentErr } = await adminClient
      .from('email_delivery_logs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'sent');

    // 4-4. 이메일 발송 실패 수
    const { count: emailFailed, error: failedErr } = await adminClient
      .from('email_delivery_logs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed');

    // 4-5. 낙상 위험도 '높음' 기록 수
    const { count: highRiskCount, error: riskErr } = await adminClient
      .from('exercise_logs')
      .select('id', { count: 'exact', head: true })
      .eq('fall_risk_index', 'high');

    if (usersErr || exercisesErr || sentErr || failedErr || riskErr) {
      console.error('[admin/dashboard] 집계 쿼리 오류:', {
        usersErr, exercisesErr, sentErr, failedErr, riskErr,
      });
      return res.status(500).json({ error: '데이터 집계 중 오류가 발생했습니다.' });
    }

    // 4-6. 최근 활동 로그 (최대 10건, 내용 아닌 이벤트 타입과 시간만)
    const { data: recentLogs, error: logsErr } = await adminClient
      .from('activity_logs')
      .select('id, event_type, page_path, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (logsErr) {
      console.error('[admin/dashboard] 활동 로그 조회 오류:', logsErr);
      return res.status(500).json({ error: '활동 로그 조회 중 오류가 발생했습니다.' });
    }

    // AGENTS.md §13: 응답에 개인정보(이메일, 전화번호 등) 포함 금지
    return res.status(200).json({
      stats: {
        totalUsers: totalUsers ?? 0,
        totalExercises: totalExercises ?? 0,
        emailSent: emailSent ?? 0,
        emailFailed: emailFailed ?? 0,
        highRiskCount: highRiskCount ?? 0,
      },
      recentLogs: recentLogs ?? [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    console.error('[admin/dashboard] 처리 오류:', message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
