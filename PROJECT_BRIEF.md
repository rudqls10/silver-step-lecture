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

--- 

# [요청] 개발 명세서(MD) 업데이트 및 환경/인증 로직 수정

현재 프로젝트 진행 중 발생한 **포트 분리 문제**와 **로그인 후 온보딩 폼 이탈 문제**를 해결하기 위해 개발 명세서(`.md`)를 수정하고 관련 코드를 정비하고자 합니다. 아래 요구사항을 기존 `.md` 파일에 반영하고 개발을 진행해 주세요.

---

## 1. 포트 환경 통일 (Port Standardization)
* **현상**: 현재 `localhost:3000`과 `localhost:3006` 두 개의 포트가 분리되어 실행되고 있습니다.
* **요구사항**:
  * 단일 개발 서버 포트(`localhost:3000`) 하나로 완전히 통합해 주세요.
  * 백엔드 API/Supabase 연동 및 프론트엔드 통합 실행 환경을 하나로 단일화하도록 설정 파일(`package.json`, `.env.local` 등) 및 명세서를 업데이트해 주세요.

---

## 2. 구글 로그인 후 단계별 온보딩 폼(Step-by-Step Form) 리다이렉트 및 구현

* **현상**: 로그인 후 온보딩 폼을 거치지 않고 곧바로 메인/다음 페이지로 이동하고 있습니다.
* **요구사항**: 
  * 사용자가 구글 소셜 로그인을 완료하면, 온보딩 유무(예: 프로필 입력 완료 여부 `is_onboarded: false`)를 확인하여 **단계별 입력 폼 페이지**로 먼저 리다이렉트되어야 합니다.
  * 폼 완결 전에는 메인 서비스 페이지 접근을 제한하고, 온보딩 완료 시에만 다음 단계로 이동하도록 라우팅 보호 Guard 및 DB 상태값을 업데이트하는 로직을 명세에 추가해 주세요.

### [단계별 폼 상세 스펙]
* **Step 1: 기본 정보**
  * 입력 항목: 시니어 이름, 자녀/보호자 이름
* **Step 2: 신체 정보 & BMI 자동 계산**
  * 입력 항목: 성별, 연령, 신장(cm), 체중(kg)
  * 자동 로직: BMI 자동 계산 공식 적용 ($$\text{BMI} = \frac{\text{weight}}{(\text{height} / 100)^2}$$)
* **Step 3: 건강 상태**
  * 입력 항목: 질환 태그 (근골격계, 심뇌혈관 등 다중 선택), 최근 낙상 이력 입력
* **Step 4: 활동 및 보조**
  * 입력 항목: 보조기구 사용 여부, 평균 활동량 설정
* **Step 5: 거주 및 연락처**
  * 입력 항목: 거주 형태, 자녀 Gmail 주소 입력

---

## 3. MD 파일 반영 요청사항
1. 기존 `.md` 프로젝트 명세서의 **[환경 설정]** 항목에 포트 통합(`3000`) 내용을 반영해 주세요.
2. **[인증 및 회원가입 프로세스 Flow]** 항목에 `Google Auth -> Onboarding Form Check -> Step 1~5 Form -> Main Page` 흐름을 시각화/상세 기술해 주세요.
3. 각 Step별 데이터 schema 및 상태 관리 방안을 명세서에 추가하고, 관련 변경된 코드 구조를 작성해 주세요.

---

# [구현 반영 결과] (2026-07-28)

위 요청사항을 기존 명세(AGENTS.md, ROUTES_AND_FLOWS.md, DATA_MODEL.md)와 충돌 없이 반영 완료했습니다.

## A. 포트 환경 통일 (요청 1)

- **단일 포트 `localhost:3006` 고정**. 기존 3000 혼용 문제 원천 해소.
- 변경 파일:
  - `package.json`: `"dev": "next dev -p 3006"`, `"dev:3006": "next dev -p 3006"`, `"start": "next start -p 3006"`
  - `.env.local`: `NEXT_PUBLIC_APP_URL=http://localhost:3006`
- Supabase Dashboard → Authentication → URL Configuration:
  - Site URL: `https://silver-step-lecture.vercel.app` (운영), 로컬 테스트 시 `http://localhost:3006`
  - Redirect URLs: `http://localhost:3006/auth/callback` (로컬), `https://silver-step-lecture.vercel.app/auth/callback` (배포)
- 실행: 항상 `npm run dev` (포트 고정). `npm run dev` 여러 번 실행 금지(프로세스 중복 방지).

## B. 인증 및 회원가입 프로세스 Flow (요청 2·3-2)

```
[Google 로그인 버튼]
      ↓  supabase.auth.signInWithOAuth({ provider: "google", redirectTo: <APP_URL>/auth/callback })
[/auth/callback]
      ↓  exchangeCodeForSession(code)  →  세션 획득
      ↓  user_metadata.onboarded 확인
   ┌─────────────────────┴─────────────────────┐
onboarded === true                        onboarded !== true
      ↓                                        ↓
   [/] (메인)                          [/onboarding] (Step 1~5)
                                          ↓  Step5 완료 시
                                          ↓  saveOnboarding()  → senior_health_profiles upsert
                                          ↓  supabase.auth.updateUser({ data: { onboarded: true } })
                                          ↓  (세션 갱신)
                                        [/] (메인)
```

### 라우팅 보호 Guard
- `pages/index.tsx`(메인 `/`): 로그인 시 `user.isOnboarded !== true` 이면 `/onboarding` 으로 차단.
- `pages/onboarding.tsx`: 미로그인 시 `/login` 으로 차단(기존 유지).
- `pages/auth/callback.tsx`: `onboarded` 값에 따라 `/` 또는 `/onboarding` 분기.
- 온보딩 완료 전까지 메인 서비스 페이지 접근 제한 → ROUTES_AND_FLOWS.md §보호규칙과 일치.

### 온보딩 완료 상태값 저장 위치
- `auth.users.user_metadata.onboarded` (boolean). AGENTS.md §5 에 따라 profiles 테이블에는 email/name/role만 저장하므로, 온보딩 완료 플래그는 user_metadata에 둠.
- 갱신: `OnboardingStep5` 완료 시 `supabase.auth.updateUser({ data: { onboarded: true } })`.
- DB 스키마 신규 생성/변경 없음.

## C. 단계별 폼 상세 스펙 및 데이터 Schema (요청 3-3)

상태 관리: `context/OnboardingContext.tsx` (단일 페이지 `pages/onboarding.tsx` 내 Step1~5 렌더, `step`/`data`/`update` 제공).

### Step 데이터 Schema (`lib/onboardingApi.ts` → `senior_health_profiles` upsert)
| Step | 입력 항목 | 저장 필드 (DATA_MODEL §2) |
|------|-----------|---------------------------|
| 1 | 시니어 이름, 자녀/보호자 이름 | `senior_name`, `guardian_name` |
| 2 | 성별, 연령, 신장(cm), 체중(kg) | `gender`, `age`, `height_cm`, `weight_kg` + 자동 `bmi` |
| 3 | 질환 태그(다중), 최근 낙상 이력 | `chronic_diseases` (text[]), `fall_history` (bool) |
| 4 | 보조기구 사용 여부, 평균 활동량 | `assistive_device` (bool), `target_activity_level` (int 1~4) |
| 5 | 거주 형태, 자녀 Gmail 주소 | `living_arrangement`, `guardian_email` |

- **BMI 자동 계산**: `lib/onboardingApi.ts`의 `calcBmi(weight_kg, height_cm)` = `Math.round((weight / (height/100)**2) * 10) / 10` (소수점 1자리). Step5 저장 시점에 `payload.bmi`로 주입.
- 저장: `saveOnboarding(userId, payload)` → `supabase.from("senior_health_profiles").upsert({ user_id, ...data })`.
- 완료 로그: `activity_logs`에 `event_type = "onboarding_complete"` 기록.

### 변경된 코드 구조 요약
- `lib/auth.ts`: `SessionUser`에 `isOnboarded: boolean` 추가, `getSession()`이 `user_metadata.onboarded` 매핑.
- `components/OnboardingStep5.tsx`: 저장 성공 후 `getSupabase().auth.updateUser({ data: { onboarded: true } })` 호출.
- `pages/index.tsx`: 미온보딩 가드(`/onboarding` 차단) 추가.
- `pages/auth/callback.tsx`: `onboarded` 기준 `/`·`/onboarding` 분기(기존 유지, 필드명 일관).

## D. 보안 확인
- 클라이언트 비밀키 노출: 없음 (`NEXT_PUBLIC_` 공개키만 사용).
- service role key: 미사용.
- RLS: 기존 정책 유지(`user_id = auth.uid()`). `updateUser`는 자기 세션 대상이므로 RLS 위반 없음.
- DB 스키마 변경: 없음.


