/**
 * emailApi.ts - 자녀/보호자 이메일 발송 클라이언트 API
 */

import { getSupabase } from "./supabaseClient";

export interface SendReportResponse {
  success: boolean;
  deliveryStatus: 'sent' | 'failed';
  requestId?: string;
  errorCode?: string;
  error?: string;
}

/** 운동 측정 데이터 — 서버로 함께 전달하여 LLM 분석에 활용 */
export interface WorkoutStats {
  totalReps: number;       // 총 운동 횟수
  durationSeconds: number; // 소요 시간 (초)
  swayScore: number;       // 신체 흔들림 수치 (cm, 작을수록 안정적)
  balanceScore: number;    // 균형도 점수 (0~100, 높을수록 양호)
  exerciseName: string;    // 운동 종목명
}

export async function sendGuardianReport(
  userId: string,
  stats: WorkoutStats,
  exerciseLogId?: string
): Promise<SendReportResponse> {
  try {
    const supabase = getSupabase();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch('/api/email/send-report', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId,
        exerciseLogId,
        stats,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        deliveryStatus: 'failed',
        errorCode: data.errorCode || data.error || `HTTP_${res.status}`,
        error: data.error || '이메일 발송에 실패했습니다.',
      };
    }

    return data;
  } catch (err: any) {
    return {
      success: false,
      deliveryStatus: 'failed',
      errorCode: 'CLIENT_NETWORK_ERROR',
      error: err?.message || '네트워크 오류가 발생했습니다.',
    };
  }
}

