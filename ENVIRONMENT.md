# 환경변수 관리 (Environment)

비밀값을 코드와 GitHub에 절대 작성하지 않는다.

로컬에서는 `.env.local`, 배포 환경에서는 Vercel Environment Variables를 사용한다.

---

## 클라이언트에서 사용 가능한 값 (`NEXT_PUBLIC_`)

| 변수명 | 설명 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명 클라이언트 키 |
| `NEXT_PUBLIC_APP_URL` | 리다이렉트 및 OAuth 처리용 기본 앱 URL |

---

## 서버에서만 사용할 값 (비밀 키)

| 변수명 | 설명 |
|--------|------|
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 관리자 DB 접근 키 (관리자 관제용) |
| `GOOGLE_CLIENT_ID` | Google OAuth 로그인 클라이언트 ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 로그인 클라이언트 비밀키 |
| `LLM_API_KEY` | 시니어 감성 피드백 및 보호자 리포트 요약 문장 생성용 LLM 키 |
| `AGENTRIA_EMAIL_API_URL` | Agentria Gmail 어빌리티 API Endpoint 주소 |
| `AGENTRIA_EMAIL_API_KEY` | Agentria Gmail 발송 인증 키 |

> ⚠️ **서버 전용 비밀 값에는 절대 `NEXT_PUBLIC_` 접두사를 붙이지 않는다.**

---

## `.env.example`

```env
# Client-side (Public)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=

# Server-side Only (Private)
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
LLM_API_KEY=
AGENTRIA_EMAIL_API_URL=
AGENTRIA_EMAIL_API_KEY=
```

> `.env.example`에는 실제 비밀 값을 절대 적지 않고 키 이름만 명시한다.

---

## Vercel 등록 및 관리 확인

- **Production / Preview / Development** 환경별로 필요한 변수를 등록한다.
- 외부 API 키(Agentria, Google OAuth, LLM 등) 누출 여부를 상시 점검한다.
- 환경변수를 신규 추가하거나 변경한 후에는 반드시 재배포(Redeploy)를 진행한다.

---

## 비기능 요구사항

- **보안:** 비밀 키는 클라이언트 코드에 절대 노출되지 않음, 서버 사이드에서만 사용. Vercel 환경 변수 암호화 저장.
- **기밀성:** `.env.local`은 `.gitignore`에 포함되어 커밋되지 않음.
- **가용성:** 환경 변수 누락 시 애플리케이션이 시작되지 않도록 시작 시 검증 스크립트 필수.
- **관리:** 환경 변수 변경 시 점진적 배포를 통해 무중단 업데이트 가능 (Vercel 환경 변수 즉시 적용).

---

## 기술 스택

- **환경 변수 관리:** Vercel Environment Variables, dotenv (로컬 개발)
- **보안 검사:** `dotenv-cli` + `dotenv-vault` 또는 `git-crypt` (선택 사항)
- **CI/CD:** GitHub Actions에서 `envsubst` 또는 Vercel CLI를 활용해 배포 시 주입
