import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { exerciseLogId, userId } = req.body || {};

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  // SUPABASE_SERVICE_ROLE_KEY 가 있으면 시크릿 키 사용, 없으면 req.headers.authorization 을 활용해 사용자 RLS 준수
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
    const gmailPass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, ''); // 공백 자동 제거

    if (!gmailUser || !gmailPass) {
      return res.status(500).json({
        error: '.env.local 에 GMAIL_USER 또는 GMAIL_APP_PASSWORD 가 설정되지 않았습니다.',
      });
    }

    // 3. Nodemailer Gmail Transporter 생성
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    const emailSubject = `[Silver Step] ${seniorName} 님의 오늘 운동 성과 및 안부 리포트`;
    const emailBody = `안녕하세요, ${guardianName} 님!

Silver Step AI 낙상 예방 서비스입니다.
오늘 ${seniorName} 님께서 낙상 예방 맞춤 운동을 성공적으로 완료하셨습니다.

■ 오늘의 운동 성과
- 어르신 성함: ${seniorName} 님
- 운동 결과: 목표 달성 완료 (신체 흔들림 수치 및 균형도 양호)
- 측정 상태: 낙상 위험도 낮음 (안정적)

앞으로도 어르신의 안전하고 건강한 하루를 위해 함께하겠습니다.
감사합니다.

- Silver Step AI 코치 드림 -`;

    let isSuccess = false;
    let messageId = '';
    let httpStatus = 200;
    let errorCode = '';

    // 4. 이메일 직접 발송
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

    // 5. 이메일 발송 결과 로그 적재 (email_delivery_logs) - 보안 원칙: 메일 제목/본문 저장 금지
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
