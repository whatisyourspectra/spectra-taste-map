# SPECTRA 계정 및 Google·카카오 로그인 설정 가이드

SPECTRA Taste Map은 **Supabase Auth (Google·카카오 OAuth PKCE 방식)**를 통해 사용자 인증을 처리합니다.
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
   - 운영 프로젝트: `https://www.spectra-music.org`
   - 로컬 전용 Supabase 프로젝트를 별도로 쓰는 경우에만 `http://localhost:5173` 등을 사용합니다.
   - 운영 프로젝트의 기본 주소를 Vercel Preview URL로 지정하지 않습니다. 인증 오류·취소 경로에서도 이 기본 주소가 사용될 수 있으며, 배포 보호가 걸린 주소라면 사용자에게 Vercel 로그인 화면이 나타납니다.
3. **Redirect URLs** 목록에 다음 경로들을 추가합니다:
   - `https://www.spectra-music.org/auth/callback`
   - `https://spectra-music.org/auth/callback`
   - `http://localhost:5173/auth/callback`
   - `http://127.0.0.1:5173/auth/callback`
   - 필요할 때만 실제 로컬 개발 포트의 `/auth/callback`을 추가합니다.

운영 Supabase의 URL Configuration은 Vite 코드나 `.env` 변경으로 수정되지 않습니다. Supabase 관리자 화면에서 위 값을 직접 저장해야 합니다. 앱은 OAuth를 시작한 브라우저의 현재 origin에 `/auth/callback`을 붙여 요청합니다. PKCE 검증값이 시작한 origin의 저장소에 있으므로 로그인 도중 callback만 다른 origin으로 바꾸지 않습니다.

### 로그인 후 Vercel 로그인 화면이 나오는 경우

2026-10-20 운영 주소에서 실제 계정 인증 없이 진입·취소 경로를 확인했습니다.

- `https://www.spectra-music.org/auth/login`과 `/auth/callback`은 공개되어 있습니다.
- 기본 인증 콜백과 Google 인증 취소 경로는 `https://spectra-taste-map-spectra123.vercel.app/`로 복귀했습니다.
- 해당 주소는 `vercel.com/sso-api`를 거쳐 Vercel 로그인 화면으로 이동했습니다.

Supabase **Authentication → URL Configuration**에서 Site URL을 운영 도메인으로 변경하고, 위 운영 callback URL들을 Redirect URLs에 등록합니다. Vercel Preview 전체의 보호를 해제할 필요는 없습니다.

저장 후에는 Google 로그인 완료와 취소를 각각 확인합니다. 로그인 완료 시 `/auth/callback?code=…`에서 세션을 교환한 뒤 원래 화면으로 돌아와야 합니다. 기본 복귀 경로의 점검은 아래 명령으로 할 수 있으며, 실제 계정으로 로그인하거나 사용자 정보를 변경하지 않습니다.

```sh
node scripts/checkAuthRedirects.mjs
```

이 점검은 기본 콜백의 이동 경로를 확인합니다. 로그인 성공이나 Redirect URLs 전체 목록을 검증하는 도구는 아닙니다.

2026-10-20 배포 전 재점검에서는 기본 콜백이 `https://www.spectra-music.org/`로 복귀하고 HTTP 200을 반환함을 확인했습니다. 기존 Vercel 로그인으로의 이동은 이 기본 복귀 경로에서 재현되지 않았습니다. 실제 계정을 이용한 로그인 완료는 별도로 확인해야 합니다.

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


## 7. 카카오 로그인 연결

기존 Google 로그인과 같은 Supabase 프로젝트를 사용합니다. 별도의 브라우저 API 키는 필요하지 않습니다.

1. [카카오 개발자 콘솔](https://developers.kakao.com)에서 SPECTRA 앱을 생성하거나 선택하고 카카오 로그인을 활성화합니다.
2. 앱의 **REST API 키** 설정에서 카카오 로그인 Redirect URI에 아래 주소를 등록합니다. Supabase의 **Authentication → Sign In / Providers → Kakao**에 표시되는 Callback URL을 복사하면 됩니다.
   ```
   https://<your-project-id>.supabase.co/auth/v1/callback
   ```
3. 카카오 로그인 **Client Secret**을 발급하고 활성화합니다.
4. Supabase의 **Authentication → Sign In / Providers → Kakao**를 활성화하고 **Client ID**에 REST API 키, **Client Secret**에 카카오 로그인 Client Secret을 입력한 뒤 저장합니다.
5. 위 4단계의 Supabase Redirect URLs에 실제 사용하는 SPECTRA 주소의 `/auth/callback`이 등록되어 있는지 확인합니다.
6. Mock 모드를 끄고 로그인 화면의 **카카오로 계속하기**를 눌러 동의 화면 → SPECTRA 복귀 → 계정 저장 → 새로고침 및 로그아웃을 확인합니다. 취소 후 다시 로그인하는 흐름도 확인합니다.

카카오에 등록하는 주소는 **Supabase `/auth/v1/callback`**, Supabase에 등록하는 복귀 주소는 **SPECTRA `/auth/callback`**입니다.
REST API 키와 Client Secret은 Supabase 대시보드에만 입력하고 `VITE_` 환경 변수에 추가하지 않습니다.

공식 설정 안내: [Supabase 카카오 로그인 가이드](https://supabase.com/docs/guides/auth/social-login/auth-kakao).

### 이메일 권한이 없는 카카오 앱 (KOE205)

SPECTRA는 카카오 로그인 시 `profile_nickname profile_image`만 요청하고 이메일은 요청하지 않습니다. 카카오 동의항목에서 닉네임·프로필 사진을 설정하고, Supabase Kakao Provider의 **Allow users without an email**을 켠 뒤 저장하세요. 계정 데이터는 이메일 대신 Supabase 사용자 ID로 저장합니다. 이메일이 없는 카카오 계정과 기존 Google 계정은 자동으로 연결되지 않습니다.


## 8. Spotify 로그인 연결

1. Spotify Developer Dashboard에서 로그인용 앱의 Settings에 Supabase Kakao/Spotify 설정에 표시되는 Callback URL (`https://<your-project-id>.supabase.co/auth/v1/callback`)을 Redirect URI로 등록합니다.
2. Supabase **Authentication → Sign In / Providers → Spotify**를 활성화하고 앱의 Client ID와 Client Secret을 입력한 뒤 저장합니다.
3. Supabase Redirect URLs에는 실제 SPECTRA 사이트의 `/auth/callback`을 등록합니다.
4. 로그인 화면의 **Spotify로 계속하기**로 동의 → 사이트 복귀 → 새로고침 → 로그아웃을 확인합니다.

Spotify 로그인은 SPECTRA 계정 인증에 사용합니다. 사용자 음악 목록을 가져오기 위한 추가 권한은 요청하지 않습니다. 카탈로그 검색용 서버 환경 변수와 별도로 Supabase에 로그인용 앱 자격 증명을 설정해야 합니다.

공식 안내: [Supabase Spotify 로그인](https://supabase.com/docs/guides/auth/social-login/auth-spotify).
