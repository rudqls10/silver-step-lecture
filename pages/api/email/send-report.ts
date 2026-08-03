import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

/** Gemini API를 호출하여 AI 코치 분석 코멘트를 생성합니다. */
async function generateLlmAnalysis(stats: {
  totalReps: number;
  durationSeconds: number;
  swayScore: number;
  balanceScore: number;
  exerciseName: string;
  seniorName: string;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // API 키가 없을 경우 기본 문구 반환
    return `오늘 ${stats.exerciseName} 운동을 ${stats.totalReps}회 완료하셨습니다. 꾸준한 운동이 건강 유지에 큰 도움이 됩니다.`;
  }

  const riskLevel = stats.balanceScore >= 85 ? '낮음(안정적)' : stats.balanceScore >= 70 ? '보통(주의)' : '높음(주의 요망)';

  const prompt = `당신은 노인 낙상 예방 전문 AI 코치입니다. 다음 운동 측정 데이터를 바탕으로, 보호자에게 보내는 다정하고 전문적인 2~3문장의 분석 피드백을 한국어로 작성해주세요. 어르신 이름을 한 번 언급하고, 수치를 자연스럽게 해석해 주세요.

운동 데이터:
- 어르신 성함: ${stats.seniorName}
- 운동 종목: ${stats.exerciseName}
- 완료 횟수: ${stats.totalReps}회
- 운동 시간: ${stats.durationSeconds}초
- 신체 흔들림 수치: ${stats.swayScore}cm (낮을수록 안정적, 3cm 이하 양호)
- 균형도 점수: ${stats.balanceScore}점 / 100점
- 낙상 위험도: ${riskLevel}

요구 형식: 2~3문장, 존댓말, 다정하고 전문적인 어조, 불필요한 인삿말이나 서명 없이 분석 내용만 작성.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 256,
          },
        }),
        signal: AbortSignal.timeout(10000), // 10초 타임아웃
      }
    );

    if (!response.ok) {
      console.warn('[Gemini API] 응답 오류:', response.status);
      return `오늘 ${stats.exerciseName} 운동을 ${stats.totalReps}회 완료하셨습니다. 균형도 ${stats.balanceScore}점으로 양호한 상태입니다.`;
    }

    const result = await response.json();
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return text.trim() || `오늘 ${stats.exerciseName} 운동을 ${stats.totalReps}회 완료하셨습니다. 균형도 ${stats.balanceScore}점으로 양호한 상태입니다.`;
  } catch (err) {
    console.warn('[Gemini API] 호출 실패, 기본 문구 사용:', err);
    return `오늘 ${stats.exerciseName} 운동을 ${stats.totalReps}회 완료하셨습니다. 균형도 ${stats.balanceScore}점으로 양호한 상태입니다.`;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { exerciseLogId, userId, stats } = req.body || {};

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.supabase_service_role;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';
  const authHeader = req.headers.authorization;

  const clientKey = serviceRoleKey || anonKey;
  const clientOptions = (!serviceRoleKey && authHeader) ? { global: { headers: { Authorization: authHeader } } } : {};

  const supabaseClient = createClient(supabaseUrl, clientKey, clientOptions);

  try {
    // 1. 온보딩 프로필에서 보호자 이메일 및 어르신/보호자 성함 조회
    const { data: profile, error: profileError } = await supabaseClient
      .from('senior_health_profiles')
      .select('senior_name, guardian_name, guardian_email')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (profileError || !profile || !profile.guardian_email) {
      const errorMsg = profileError?.message || '보호자 이메일 정보가 존재하지 않습니다.';
      return res.status(400).json({ error: errorMsg });
    }

    const seniorName = profile.senior_name || '어르신';
    const guardianName = profile.guardian_name || '보호자';
    const guardianEmail = profile.guardian_email;

    // 2. Gmail 발송 설정 확인
    const gmailUser = process.env.GMAIL_USER || '';
    const gmailPass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');

    if (!gmailUser || !gmailPass) {
      return res.status(500).json({
        error: '.env.local 에 GMAIL_USER 또는 GMAIL_APP_PASSWORD 가 설정되지 않았습니다.',
      });
    }

    // 3. LLM(Gemini)으로 AI 코치 분석 코멘트 생성
    const workoutStats = stats || {
      totalReps: 0,
      durationSeconds: 0,
      swayScore: 3.5,
      balanceScore: 80,
      exerciseName: '낙상 예방 운동',
    };

    const llmComment = await generateLlmAnalysis({
      ...workoutStats,
      seniorName,
    });

    // 4. Nodemailer Gmail Transporter 생성
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    const durationMin = Math.floor(workoutStats.durationSeconds / 60);
    const durationSec = workoutStats.durationSeconds % 60;
    const durationText = durationMin > 0
      ? `${durationMin}분 ${durationSec}초`
      : `${durationSec}초`;

    const riskLevel = workoutStats.balanceScore >= 85 ? '낮음 (안정적)' : workoutStats.balanceScore >= 70 ? '보통 (주의)' : '높음 (주의 요망)';

    const emailSubject = `[Silver Step] ${seniorName} 님의 오늘 운동 성과 및 안부 리포트`;
    const emailBody = `안녕하세요, ${guardianName} 님!

Silver Step AI 낙상 예방 서비스입니다.
오늘 ${seniorName} 님께서 낙상 예방 맞춤 운동을 성공적으로 완료하셨습니다.

■ 오늘의 운동 측정 결과
- 어르신 성함: ${seniorName} 님
- 운동 종목: ${workoutStats.exerciseName}
- 완료 횟수: ${workoutStats.totalReps}회
- 운동 시간: ${durationText}
- 신체 흔들림 수치: ${workoutStats.swayScore}cm
- 균형도 점수: ${workoutStats.balanceScore}점 / 100점
- 낙상 위험도: ${riskLevel}

■ AI 코치 분석
${llmComment}

앞으로도 어르신의 안전하고 건강한 하루를 위해 함께하겠습니다.
감사합니다.

- Silver Step AI 코치 드림 -`;

    let isSuccess = false;
    let messageId = '';
    let httpStatus = 200;
    let errorCode = '';

    // 5. 이메일 직접 발송
    try {
      const info = await transporter.sendMail({
        from: `"Silver Step AI" <${gmailUser}>`,
        to: guardianEmail,
        subject: emailSubject,
        text: emailBody,
      });

      isSuccess = true;
      messageId = info.messageId || 'GMAIL_OK';
    } catch (sendErr: any) {
      console.error('[Gmail Send Error]:', sendErr);
      httpStatus = 500;
      errorCode = sendErr?.message || 'GMAIL_SEND_FAILED';
    }

    // 6. 이메일 발송 결과 로그 적재 (이메일 본문/제목 저장 금지)
    try {
      await supabaseClient.from('email_delivery_logs').insert({
        user_id: userId,
        exercise_log_id: exerciseLogId || null,
        status: isSuccess ? 'sent' : 'failed',
        http_status: httpStatus,
        provider_request_id: messageId || null,
        error_code: errorCode || null,
      });
    } catch (dbErr) {
      console.warn('[email_delivery_logs] DB insert warn:', dbErr);
    }

    if (!isSuccess) {
      return res.status(500).json({
        success: false,
        deliveryStatus: 'failed',
        errorCode: errorCode || 'GMAIL_SEND_FAILED',
        error: `Gmail 발송 실패: ${errorCode}`,
      });
    }

    return res.status(200).json({
      success: true,
      deliveryStatus: 'sent',
      requestId: messageId,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Internal Server Error' });
  }
}

