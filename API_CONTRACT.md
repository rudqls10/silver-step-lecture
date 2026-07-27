# API 계약서 (API Contract)

> 확인하지 않은 주소와 응답 구조를 임의로 작성하지 않는다.
> 실제 구현 전 공식 문서와 Postman 또는 개발 환경에서 확인한다.

---

## 1. AI 전신 관절 좌표 분석 & 흔들림 측정

- **앱 내부 Route:** `POST /api/pose/analyze`
- **목적:** 카메라로 입력받은 시니어의 관절 뼈대 좌표 데이터(Raw)를 수집하여 실시간 신체 흔들림 수치, 균형도, 낙상 위험도를 계산한다.
- **분석 엔진:** 온디바이스 AI 관절 분석 및 Agentria 분석 엔진

**요청 예시**
```json
{
  "userId": "user-uuid",
  "poseCoordinates": [
    { "joint": "left_knee", "x": 0.45, "y": 0.72, "z": 0.12 },
    { "joint": "right_knee", "x": 0.52, "y": 0.71, "z": 0.11 },
    { "joint": "center_of_mass", "x": 0.48, "y": 0.65, "z": 0.10 }
  ],
  "durationSeconds": 30,
  "exerciseType": "squat"
}
```

**검증 규칙**
- `userId`: 세션 식별자 확인
- `poseCoordinates`: 배열 형태의 관절 좌표 데이터 필수
- **주의:** 원본 카메라 영상 비디오 파일은 절대 서버로 전송 및 저장하지 않음 (프라이버시 보호)

**앱이 사용할 정규화 응답**
```json
{
  "analysisId": "analysis-uuid",
  "swayScore": 14.2,
  "balanceLevel": "good",
  "kneeAngleDiff": 5,
  "fallRiskIndex": "low",
  "timestamp": "2026-07-25T14:45:00Z"
}
```

---

## 2. LLM 피드백 및 보호자 알림 문장 생성

- **앱 내부 Route:** `POST /api/feedback/generate`
- **목적:** 측정된 신체 흔들림 수치와 관절 좌표 분석 결과를 바탕으로, 시니어용 감성 VUI 음성 피드백 텍스트와 자녀/보호자 전달용 알림 문장을 생성한다.

**요청 예시**
```json
{
  "analysisId": "analysis-uuid",
  "swayScore": 14.2,
  "kneeAngleDiff": 5,
  "exerciseType": "squat",
  "userName": "김순자",
  "guardianName": "홍길동"
}
```

**응답 예시**
```json
{
  "vuiAudioText": "무릎을 5도만 덜 구부리시면 더 안전해요. 하체 토크 7% 상승!",
  "guardianMessageSummary": "오늘 어머니께서 스쿼트 운동을 완수하셨습니다. 신체 흔들림 수치가 저번보다 개선되어 안정적인 상태입니다."
}
```

**제한**
- 감성적이고 긍정적인 안심 언어 위주로 생성한다.
- 오류/실패 경고음이나 위협적인 단어 생성을 금지한다.
- 개인정보, 민감 정보, 의료 진단 성격의 확정적 문장을 LLM에 직접 전달하지 않는다.

---

## 3. 운동 기록 및 관절 데이터 저장

- **앱 내부 Route:** `POST /api/exercise/save`
- **인증:** Supabase 로그인 세션 필수

**요청 예시**
```json
{
  "analysisId": "analysis-uuid",
  "exerciseType": "squat",
  "durationSeconds": 30,
  "swayScore": 14.2,
  "vuiFeedbackText": "무릎을 5도만 덜 구부리시면 더 안전해요.",
  "guardianSummary": "오늘 운동 완수 및 신체 흔들림 수치 안정적"
}
```

**처리**
- 서버에서 로그인 사용자 ID 확인 (`user_id`는 세션에서 추출)
- 운동 기록 DB 저장 (`exercise_logs`)
- `exercise_completed` 활동 로그 추가

---

## 4. 자녀/보호자 Gmail 알림 발송

- **앱 내부 Route:** `POST /api/email/send-report`
- **목적:** 운동 완료 후 Agentria Gmail 어빌리티 API를 호출해 등록된 자녀/보호자의 이메일로 부모님의 운동 결과 및 안부 리포트를 보낸다.

**앱 요청 예시**
```json
{
  "exerciseLogId": "exercise-log-uuid"
}
```

> 클라이언트는 이메일 본문을 직접 전달하지 않으며, 서버가 `exerciseLogId`로 필요한 데이터를 조회하여 메일 내용을 생성한다.

**Agentria API 요청 개념**
```json
{
  "to": "자녀/보호자 이메일",
  "subject": "[Silver Step] 부모님의 오늘 운동 성과 및 안부 리포트",
  "body": "운동 성과 요약 및 AI 안부 메시지"
}
```

> 실제 필드명과 인증 헤더는 Agentria API 어빌리티 명세를 따른다.

**앱 응답 예시**
```json
{
  "success": true,
  "deliveryStatus": "sent",
  "requestId": "agentria-request-id"
}
```

**DB 저장 규칙 (`email_delivery_logs`)**

저장 항목:

| 필드 | 설명 |
|------|------|
| `user_id` | 시니어 사용자 ID |
| `exercise_log_id` | 운동 기록 ID |
| `status` | sent / failed |
| `http_status` | HTTP 상태 코드 |
| `provider_request_id` | 제공자 요청 ID |
| `error_code` | 오류 코드 (실패 시) |
| `created_at` | 생성 시각 |

저장하지 않을 항목:
- 이메일 제목 및 본문 전체
- Gmail OAuth 토큰 및 Agentria API 키
- 카메라 원본 영상 데이터
- 전체 API 응답 원문

**실패 처리**
- Gmail 발송 실패 시에도 저장된 운동 기록(`exercise_logs`)은 삭제하지 않는다.
- `email_delivery_logs`에 `failed` 상태와 오류 코드만 기록한다.
- 보호자 또는 방문 코치 화면에서 '재발송' 버튼을 제공할 수 있다.

---

## 5. 관리자 조회 (B2B2G SaaS)

- **앱 내부 Route:**
  - `GET /api/admin/overview`
  - `GET /api/admin/seniors`
  - `GET /api/admin/risk-monitoring`
  - `GET /api/admin/activity`
- **인증:**
  - 로그인 세션 확인
  - 서버에서 관리자 Role(기관/병원 관리자) 확인
  - 일반 시니어/보호자 사용자는 403 Forbidden 반환

**응답에서 제외할 정보**
- 시니어 가정 내 촬영 원본 영상
- OAuth 토큰 및 API 키
- 보호자에게 발송된 이메일 본문 전체
- 전체 LLM 프롬프트 및 외부 API 원문 응답

---

## 비기능 요구사항

- **성능:** API 응답 지연 < 2초, 동시 사용자 50명 대응
- **보안:** 엔드 투 엔드 암호화, 영상 미저장, 정기 보안 점검
- **접근성:** WCAG 2.1 AA 준수, 큰 글자, 고대비, 스크린리더 지원
- **확장성:** Vercel 서버리스 자동 스케일링, Supabase 자동 확장

---

## 기술 스택

- **프론트엔드:** Next.js, TypeScript, Tailwind CSS
- **백엔드:** Supabase (PostgreSQL), Vercel Serverless Functions
- **인증:** Google OAuth 2.0 (NextAuth)
- **AI/Agentria:** Agentria Gmail 어빌리티 API, LLM (예: GPT-4o)
- **배포:** Vercel, GitHub Actions CI/CD

---

## 아키텍처 개요도

```
[클라이언트 (Next.js)]
        ↓ (HTTPS)
[API 라우트 (Vercel Serverless)]
        ↓
+----------------+        +----------------+
| Supabase DB    |        | Agentria API   |
| (프로필, 로그) |        | (이메일 발송)  |
+----------------+        +----------------+
        ↓
[LLM 서비스 (예: OpenAI)]
```

> 참고: 원본 카메라 영상은 로컬에서 즉시 파기, 관절 좌표만 전송

---

## 출시 계획 / 로드맵

- **MVP (현재 버전):** Google 로그인, 온보딩, Zero-Touch VUI 코칭, 이메일 알림, 관리자 대시보드 기본
- **베타 테스트:** 2026 Q3 내부 시범 운영, 피드백 기반 UI/UX 개선
- **향후 기능:** 그룹 운동 모드, 음성 명령 확장, 건강 데이터 연동 (Google Fit), 다국어 지원
- **출시 목표:** 2026 Q4 정식 출시, 버전 1.0

---

## 라이선스 및 기여 가이드

- **라이선스:** MIT License (또는 프로젝트별 선택)
- **기여 방법:** Issues → Fork → Pull Request 순으로 진행
- **이슈 보고:** 버그 및 기능 요청은 GitHub Issues에 템플릿을 사용해 주세요
- **개발 설정:** `npm install`, `.env.local` 설정 후 `npm run dev`
