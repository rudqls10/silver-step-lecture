# 데이터 모델 (Silver Step)

> Supabase(PostgreSQL) 기반의 시니어 낙상 예방 운동 플랫폼 데이터 모델 정의서

---

## 공통 원칙

- 모든 사용자 데이터는 Supabase 사용자 ID(`auth.users.id`)와 연결한다.
- 일반 사용자는 자기 행만 조회 및 관리한다.
- 관리자 조회의 권한 검증은 서버에서 반드시 수행한다.
- **프라이버시 강력 보호:** 원본 카메라 영상 비디오 파일은 절대 저장하지 않으며, 이메일 본문 전체 및 외부 API 원문 응답은 저장하지 않는다.
- 긴 문자열 및 불필요한 빅데이터 저장을 피하고, 관절 좌표 수치, 요약 텍스트, 발송 상태만 저장한다.

---

## 1. profiles

**목적:** Google 로그인 사용자 기본 정보 및 역할 저장

| 필드 | 타입 | 설명 / 제약 |
|------|------|-------------|
| `id` | uuid | `auth.users.id`와 동일 (기본 식별자) |
| `email` | text | 사용자 이메일 |
| `full_name` | text | 시니어 사용자 이름 |
| `avatar_url` | text | nullable |
| `role` | text | 기본값 `'user'`, 허용값 `'user'` / `'guardian'` / `'admin'` |
| `created_at` | timestamptz | 생성 시각 |
| `last_login_at` | timestamptz | 최근 로그인 시각 |

> **주의:** `id`가 기본 사용자 식별자이며, `email`은 변경 가능하므로 관계 기본키로 사용하지 않는다.

---

## 2. senior_health_profiles (온보딩 건강 정보)

**목적:** 시니어 사용자의 신체 기초 데이터, 질환 태그, 보행 목표 및 보호자 연락처 저장

| 필드 | 타입 | 설명 / 제약 |
|------|------|-------------|
| `id` | uuid | 기본키 |
| `user_id` | uuid | `profiles.id` 외래키 |
| `gender` | text | 남/여 |
| `age` | integer | 연령 |
| `height_cm` | numeric | 신장 |
| `weight_kg` | numeric | 체중 |
| `bmi` | numeric | BMI 자동 계산값 |
| `chronic_diseases` | text[] | 만성질환 태그 배열 (예: `['근골격계', '심뇌혈관']`) |
| `fall_history` | boolean | 최근 낙상 이력 유무 |
| `assistive_device` | boolean | 보조기구 사용 여부 |
| `target_activity_level` | integer | 1~4 레벨 |
| `guardian_name` | text | 자녀/보호자 이름 |
| `guardian_email` | text | 보호자 Gmail 수신 주소 |
| `created_at` | timestamptz | 생성 시각 |
| `updated_at` | timestamptz | 수정 시각 |

---

## 3. exercise_logs (운동 및 관절 좌표 기록)

**목적:** 실시간 신체 흔들림 수치, 추출된 관절 좌표 데이터 및 생성된 피드백 저장

| 필드 | 타입 | 설명 / 제약 |
|------|------|-------------|
| `id` | uuid | 기본키 |
| `user_id` | uuid | `profiles.id` 외래키 |
| `exercise_type` | text | 운동 종류 (예: `squat`, `balance_stand`) |
| `duration_seconds` | integer | 운동 수행 시간(초) |
| `sway_score` | numeric | 측정된 신체 흔들림 수치 |
| `fall_risk_index` | text | 낙상 위험도 (예: `low`, `medium`, `high`) |
| `pose_coordinates_summary` | jsonb | 관절 뼈대 주요 좌표 요약 수치 |
| `vui_feedback_text` | varchar(500) | LLM이 생성한 100% 음성 코칭 문구 |
| `guardian_summary_text` | varchar(500) | 보호자 전달용 요약 문장 |
| `created_at` | timestamptz | 생성 시각 |

**저장하지 않을 데이터:**
- 카메라 촬영 원본 영상 파일 전체 (로컬 즉시 파기)
- 불필요하게 길거나 복잡한 원본 LLM 프롬프트 전체

---

## 4. email_delivery_logs

**목적:** Agentria Gmail 어빌리티의 알림 발송 결과만 저장

| 필드 | 타입 | 설명 / 제약 |
|------|------|-------------|
| `id` | uuid | 기본키 |
| `user_id` | uuid | 시니어 사용자 ID |
| `exercise_log_id` | uuid | `exercise_logs.id` 외래키 |
| `status` | text | `requested` / `sent` / `failed` |
| `http_status` | integer | nullable |
| `provider_request_id` | text | nullable |
| `error_code` | varchar(100) | nullable |
| `created_at` | timestamptz | 생성 시각 |

**절대 저장하지 않을 데이터:**
- 이메일 제목 및 본문 전체 (`subject`, `body`)
- Gmail OAuth 토큰 및 Agentria API 키
- 전체 외부 API 원문 응답

---

## 5. activity_logs

**목적:** 시니어/보호자/관리자의 시스템 활동 및 서비스 이탈/오류 분석

| 필드 | 타입 | 설명 / 제약 |
|------|------|-------------|
| `id` | uuid | 기본키 |
| `user_id` | uuid | nullable |
| `event_type` | text | `login`, `onboarding_complete`, `exercise_completed`, `email_sent` 등 |
| `page_path` | text | nullable |
| `target_type` | text | nullable |
| `target_id` | text | nullable |
| `status` | text | `success` / `failed` |
| `error_code` | varchar(100) | nullable |
| `metadata` | jsonb | 기본값 빈 객체 `{}` |

**metadata 허용 예시:**
```json
{
  "exerciseType": "squat",
  "durationSeconds": 30
}
```

**metadata 금지 예시:**
- 사용자 카메라 영상 및 원본 바이너리 데이터
- 이메일 본문 전체 및 전체 LLM 프롬프트
- OAuth 토큰 및 API 비밀키

---

## RLS (Row Level Security) 개념

- **profiles:**
  - 사용자는 자기 profile만 조회 가능 (`auth.uid() = id`)
  - 사용자는 허용된 자기 필드만 수정 가능
- **senior_health_profiles:**
  - `user_id = auth.uid()`인 행만 조회·삽입·수정 가능
- **exercise_logs:**
  - `user_id = auth.uid()`인 행만 조회·삽입 가능
- **email_delivery_logs:**
  - 사용자는 자기 발송 상태만 조회 가능
  - 레코드 삽입은 서버 API Route 중심으로 처리
- **activity_logs:**
  - 일반 사용자는 자기 로그만 제한적으로 조회 가능
  - B2B2G 관리자는 서버 권한 검증 후 전체 조회 가능

---

## 관리자 권한 (B2B2G SaaS)

- `profiles.role = 'admin'`인 사용자만 관리자 페이지 및 관제 API 사용 가능.
- UI 메뉴 숨김과 별개로 서버 Route에서 `role` 및 토큰을 다시 검증.
- `service_role_key`는 관리자 권한을 검증한 서버 API Route에서만 사용.

---

## 비기능 요구사항

- **성능:** API 응답 지연 < 2초, 동시 사용자 50명 대응
- **보안:** 엔드 투 엔드 암호화, 영상 미저장, 정기 보안 점검
- **접근성:** WCAG 2.1 AA 준수, 큰 글자, 고대비, 스크린리더 지원
- **확장성:** Vercel 서버리스 자동 스케일링, Supabase 자동 확장
- **데이터 보관:** 운동 로그 5년 보관 후 삭제, 이메일 발송 로그 1년 보관 (법적 요구사항에 따름)

---

## 기술 스택

- **데이터베이스:** Supabase (PostgreSQL)
- **ORM/쿼리 빌더:** Prisma 또는 직접 SQL (Supabase 클라이언트)
- **마이그레이션 관리:** Supabase Migration SDK 또는 SQL 파일 버전 관리
- **백엔드 언어:** TypeScript (Node.js) on Vercel Serverless Functions
- **인증:** NextAuth.js (Google OAuth 2.0)
- **캐시/세션:** Redis (선택) 또는 Supabase 세션
- **모니터링:** Sentry (에러 추적), Logtail 또는 Vercel Logs
- **CI/CD:** GitHub Actions → Vercel 배포

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
