# SPECTRA 계정 및 Google 로그인 설정 가이드

SPECTRA Taste Map은 **Supabase Auth (Google OAuth PKCE 방식)**를 통해 사용자 인증을 처리합니다.
이 가이드를 따라 Supabase와 Google Cloud 설정을 완료하면 실제 Google 로그인을 사용할 수 있습니다.

---

## 1. Supabase 프로젝트 생성

1. [Supabase 공식 홈페이지](https://supabase.com)에 로그인합니다.
2. **New Project**를 클릭하여 새 프로젝트를 생성합니다.
3. 생성이 완료되면 좌측 메뉴의 **Project Settings (톱니바퀴) → API**로 이동합니다.
4. 다음 정보를 복사해 둡니다:
   - **Project URL**: `https://<your-project-id>.supabase.co`
   - **Project API keys**: `anon` `public` 키 (또는 `publishable` 키)

---

## 2. Google Cloud Console에서 OAuth 클라이언트 생성

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속합니다.
2. **API 및 서비스 → 사용자 인증 정보**로 이동합니다.
3. **+ 사용자 인증 정보 만들기 → OAuth 클라이언트 ID**를 선택합니다.
   - 애플리케이션 유형: **웹 애플리케이션 (Web application)**
   - 이름: `SPECTRA Taste Map` (원하는 이름)
4. **승인된 리디렉션 URI (Authorized redirect URIs)**에 다음 Supabase 콜백 URL을 추가합니다:
   ```
   https://<your-project-id>.supabase.co/auth/v1/callback
   ```
   *(주의: localhost가 아니라 위 1단계에서 확인한 Supabase 프로젝트 URL의 `/auth/v1/callback`입니다.)*
5. 생성을 완료하고 발급된 **클라이언트 ID(Client ID)**와 **클라이언트 보안 비밀번호(Client Secret)**를 복사합니다.

---

## 3. Supabase에 Google Provider 등록

1. Supabase 대시보드로 돌아와 **Authentication → Providers** 메뉴로 이동합니다.
2. **Google**을 찾아 활성화(Enable)합니다.
3. 2단계에서 복사한 값들을 입력합니다:
   - **Client ID (for OAuth)**: Google 클라이언트 ID
   - **Client Secret (for OAuth)**: Google 클라이언트 보안 비밀번호
4. **Save**를 클릭하여 저장합니다.

---

## 4. Supabase URL Configuration (Redirect URLs 등록)

사용자가 Google 로그인을 마친 뒤 애플리케이션으로 안전하게 돌아오도록 허용된 URL을 등록해야 합니다.

1. Supabase 대시보드의 **Authentication → URL Configuration**으로 이동합니다.
2. **Site URL**:
   - 로컬 개발 시: `http://localhost:5173` (또는 `http://127.0.0.1:5173`)
3. **Redirect URLs** 목록에 다음 경로들을 추가합니다:
   - `http://localhost:5173/auth/callback`
   - `http://127.0.0.1:5173/auth/callback`
   - *(배포 시)* `https://<your-production-domain>.vercel.app/auth/callback`

---

## 5. 로컬 `.env` 환경 변수 설정

프로젝트 루트의 `.env` 파일에 아래 환경 변수를 추가합니다:

```env
# Supabase URL (1단계 Project URL)
VITE_SUPABASE_URL=https://<your-project-id>.supabase.co

# Supabase Anon / Publishable Key (1단계 Project API key)
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# (또는 VITE_SUPABASE_ANON_KEY=... 로 지정해도 지원됩니다)
```

> [!CAUTION]
> 절대 `service_role` 비밀키나 Google Client Secret을 클라이언트 코드/`.env`의 `VITE_` 변수에 넣지 마세요.
> 오직 공개 가능한 `anon` (publishable) 키만 브라우저 환경 변수에 입력해야 합니다.

---

## 6. 개발용 Mock 모드 (선택 사항)

Supabase 프로젝트를 설정하기 전이거나 오프라인 환경에서 계정 전환 및 UI 흐름을 테스트하고 싶다면:

```env
VITE_AUTH_MOCK=1
```

이 옵션을 켜거나 로그인 화면의 **"테스트 계정으로 체험하기"** 버튼을 사용하면 백엔드 설정 없이도 즉시 가상 사용자로 로그인/로그아웃 및 데이터 보존 동작을 검증할 수 있습니다.
