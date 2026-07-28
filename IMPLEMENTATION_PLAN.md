# 구현 계획 로드맵 (Implementation Plan)

> 원본 `PROJECT_BRIEF.txt` 하단에 붙어 있던 계획 대화 로그를 정리한 문서입니다.
> **현재 범위:** API 라우트(`/api/*`)를 새로 만드는 작업(카메라 인식·LLM 피드백)은 제외하고, **커스텀 API가 불필요한 프론트엔드 + Supabase 클라이언트 직접 연동 작업만** 포함합니다.
> 코드 수정은 금지하고 문서 검토 → 현상 확인 → 계획 보고 순으로 진행합니다.
> 제공 문서(프로젝트 정의, UI_REFERENCE, API_CONTRACT, 교육용 AI 웹앱 공통 개발 규칙)를 기준으로만 작성하며, 누락/충돌 시 추측하지 않고 사용자에게 보고합니다.

---

## 범위에서 제외된 작업 (API 필요)

아래 항목은 서버 API 라우트 신규 생성이 필요하므로 이 계획에서 제외합니다.

- **조건 3. 카메라 전신 인식 & VUI 음성 코칭** — `/api/pose/analyze` 호출 필요
- **조건 4. Agentria 및 LLM 기반 피드백 텍스트 가공** — `/api/feedback/generate` 엔드포인트 신규 생성 필요

---

## 2. 온보딩 플로우 구축 (API 불필요 — Supabase 클라이언트 직접 연동)

**작업 목표:** 5단계 온보딩 흐름을 구축하고, 입력 값을 Supabase `profiles` 테이블에 저장한다. BMI는 클라이언트에서 자동 계산. 커스텀 API 라우트 없이 Supabase JS 클라이언트의 `update`로 처리.

**수정할 파일:**
- `pages/onboarding/[step].tsx` (또는 `app/onboarding/[step]/page.tsx`)
- `components/OnboardingStep1.tsx` ~ `Step5.tsx`
- `lib/onboardingApi.ts` (Supabase upsert/update 함수)
- `context/OnboardingContext.tsx` (단계 상태 관리)

**구현 내용:**
1. 단계별 폼 구현:
   - Step 1: 시니어 이름, 자녀/보호자 이름 입력
   - Step 2: 성별, 연령, 신장, 체중 입력 → BMI 자동 계산 (`weight / (height/100)²`)
   - Step 3: 질환 태그(근골격계, 심뇌혈관 등), 최근 낙상 이력 입력
   - Step 4: 보조기구 사용 여부, 평균 활동량 설정
   - Step 5: 거주 형태, 자녀 Gmail 주소 입력
2. 각 단계 "다음" 클릭 시 폼 값을 로컬 상태에 저장.
3. Step 5 완료 시 모든 입력 값을 모아 Supabase `profiles` 테이블에 `update` (where `user_id` = 현재 로그인 사용자 ID).
4. 저장 성공 시 `/exercise`로 리다이렉트.

**완료 확인 방법:**
- 문서 검토: 프로젝트 정의의 "사용자가 입력하는 정보" 항목과 UI_REFERENCE의 "온보딩 화면" 단계별 필수 요소 대조
- 현상 확인: 로그인 상태 유지 및 온보딩 미완 시 `/onboarding/1` 라우트 접근 가능 여부 확인
- 계획 보고: 수정 파일 목록과 구현 내용을 기반으로 계획 수립
- 검증(가상):
  - 각 단계 입력 필드가 UI_REFERENCE에 명시된 요소와 일치하는지 시각 검토 (참고 이미지 부재 시 구조만 검토)
  - BMI 자동 계산 로직이 Step 2에 포함되는지 코드 주석으로 확인 예정
  - 최종 제출 시 네트워크 요청에 `200` 응답과 함께 Supabase에 `height`, `weight`, `bmi`, `guardian_email` 필드가 저장되는지 확인 예정

**예상 위험:**
- UI_REFERENCE에 참조된 이미지(`onboarding-reference.png`)가 제공되지 않아 정확한 레이아웃/컴포넌트 구현 불가 위험
- 프로젝트 정의에 Supabase 테이블 스키마 미제시로 `profiles` 테이블 컬럼명(`guardian_email` 등) 추론 오류 가능
- 클라이언트 측 BMI 계산 로직 오류로 잘못된 값 저장 위험 (예: 단위 혼동 — cm vs m)
- RLS 정책 미확인으로 `update` 작업이 차단될 수 있음 (교육용 규칙 §6 참고)

---

## 다음 단계 안내

위 온보딩 작업(조건 2)에 대한 구현 계획을 완료했습니다. API 라우트가 필요한 조건 3·4는 이 범위에서 제외했습니다. 진행 시 반드시 다음과 같이 행동합니다:

1. 코드 수정 전 `AGENTS.md` → `PROJECT_BRIEF.md` → `ROUTES_AND_FLOWS.md` → `UI_REFERENCE.md` → `API_CONTRACT.md` → `DATA_MODEL.md` → `ENVIRONMENT.md` → `package.json` → 현재 프로젝트 파일 구조 순으로 문서 확인
2. 문서가 비어 있거나 충돌되는 경우 추측하지 않고 사용자에게 즉시 보고
3. 한 번에 한 가지 작업만 수행하고 필요한 파일만 최소 수정
4. 개발 서버에서 직접 확인 후 빌드 명령 실행
5. 오류가 있으면 원인을 확인한 뒤 수정
6. 수정 파일과 테스트 결과를 보고

추가로 확인해야 할 문서나 구체적인 질문이 있으면 즉시 알려주세요. 작업을 시작하기 전에 현재 프로젝트 구조와 `package.json`을 먼저 확인하여 제시된 파일들의 존재 여부를 점검할 예정입니다.
(사용자의 별도 지시가 있을 경우 수행합니다.)

---

## 환경변수

이 프로젝트에는 다음 환경변수가 필요하다.

- `NEXT_PUBLIC_SUPABASE_URL`
  - Supabase 프로젝트 주소
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - 브라우저에서 사용하는 Supabase 공개 키

실제 값은 `.env.local`과 Vercel Environment Variables에 저장한다.
MD 파일과 GitHub에는 실제 값을 기록하지 않는다.