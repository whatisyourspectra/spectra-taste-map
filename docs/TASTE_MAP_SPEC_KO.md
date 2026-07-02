# Taste Map 기술 스펙 및 디자인 현황

- 문서 버전: v1.0
- 최종 업데이트: 2026-05-16
- 대상 경로: `/taste-map`
- 스코프: `TasteMapPage`(desktop), `TasteMapMobilePage`(mobile)

## 1. 목적
Taste Map은 Spotify 청취 데이터를 기반으로 개인의 음악 취향을 공간적으로 탐험하는 화면이다.
핵심 목표는 통계 표출이 아니라, 취향 분포/변화/겹침을 직관적으로 탐색하는 인터랙션 제공이다.

## 2. 라우팅 및 플랫폼 분기
- 라우트: `/taste-map`
- 분기 기준: `max-width: 900px`
  - 데스크탑: `src/pages/TasteMapPage.jsx`
  - 모바일: `src/pages/TasteMapMobilePage.jsx`
- 분기 구현: `src/App.jsx` `ResponsiveTasteMapRoute`

## 3. 데이터 소스 및 API
Taste Map에서 직접 사용하는 주요 API:
1. `GET /api/me/profile`
2. `GET /api/me/recently-played?limit=50`
3. `GET /api/me/liked-tracks-features` (feature + genre)
4. `GET /api/me/taste-library-summary`
5. `POST /api/me/playback/play-track` (트랙 클릭 재생)

## 4. 클라이언트 계산 파이프라인
1. 트랙/feature/genre 로드
2. 세션 캐시 조회
3. 클러스터링 워커 실행
4. 버블 레이아웃 워커 실행
5. 모드별 렌더링 + 필터 적용

세션 캐시 키:
- `taste-map-fetch-v2`
- `taste-map-cluster-v1`
- `taste-map-library-v1`
- TTL: 각 10분

웹 워커:
- `src/workers/kmeansWorker.js`
- `src/workers/bubbleLayoutWorker.js`

## 5. 데스크탑 기능 현황 (현재)

### 5.1 뷰 모드
1. `Scatter Map`
2. `Bubble Explorer`
3. `3D Map`

### 5.2 축/프리셋
- 축: `valence`, `energy`, `danceability`, `acousticness`, `instrumentalness`
- 프리셋: `mood`, `dance`, `acoustic`
- 3D 모드에서 Z축 선택 가능

### 5.3 필터/선택 동작
- 클러스터 태그 선택: 토글 방식
  - 같은 태그 재클릭 시 해제
- 곡 클릭: 재생만 수행
  - 곡 클릭으로 클러스터 태그가 자동 선택되지 않음
- 기간 카드 선택 시 `selectedCluster`는 해제되어 기간 기반 탐색 우선

### 5.4 Bubble Explorer 인터랙션
- 드래그 팬, 휠/핀치 줌
- Navigator 미니맵으로 현재 뷰 이동
- 현재 버블 포커스 버튼 제공
- 자동 중앙정렬은 버블 모드 진입 시 1회만 수행
  - 곡 클릭/클러스터 선택 시 카메라 점프 방지

### 5.5 Time Story (Taste Evolution Timeline)
- 단위: 월별/분기별
- 범위: `6M`, `12M`, `24M`, `ALL`
- 가로 스크롤 탐색 지원 (휠 가로 전환 포함)
- `이전/다음` 이동 버튼 제공
- 선택 기간 카드 자동 중앙 정렬
- 초기 진입 시 최신 기간 자동 선택

### 5.6 Taste Year Compare 패널
- 현재 페르소나 vs 연도별 페르소나 비교
- 모드: `blend`, `split`
- 소스: `recent`, `liked`, `top`
- 겹침 강도 기반 코어/버블 시각화

### 5.7 Share 모드
- 버블별 선택(+)
- 선택 목록 텍스트 복사

## 6. 모바일 기능 현황 (현재)
파일: `src/pages/TasteMapMobilePage.jsx`

탭 구조:
1. `Universe`
2. `Drift`
3. `공유`

핵심:
- 장르 버블 클라우드 탐색
- 연도별 드리프트 요약
- 모바일 공유 텍스트 복사
- mood/discovery/drift 요약 카드 제공

## 7. 디자인 현황 (현재)

### 7.1 디자인 방향
- Deep blue 기반 glass UI
- 반투명 패널 + 소프트 보더 + 저강도 glow
- 데이터 오브젝트(버블)와 UI chrome(컨트롤) 시각 분리

### 7.2 디자인 토큰 (desktop)
`src/pages/TasteMapPage.css` 주요 토큰:
- `--tm-glass-bg`
- `--tm-glass-soft-bg`
- `--tm-glass-border`
- `--tm-glass-border-strong`
- `--tm-glass-shadow`
- `--tm-glass-shadow-soft`
- `--tm-glass-blur`
- `--tm-accent-border`
- `--tm-accent-bg`

### 7.3 레이아웃 정렬 기준
맵 오버레이 정렬 변수:
- `--tm-overlay-top`
- `--tm-overlay-bottom`
- `--tm-overlay-right`
- `--tm-sidebar-overlay-w`

현재 정렬 정책:
- `Field Inspector`: 우측 오버레이 컬럼(상/하 앵커)
- `Navigator`: 하단 우측 고정
- 상단 액션(확대/추천/공유): 동일 top-axis 정렬

### 7.4 최근 UX 반영 사항
1. 곡 클릭 시 맵 뷰 위치 점프 제거
2. 곡 클릭 시 장르 태그 자동 선택 제거
3. 태그 재클릭 해제 토글 지원
4. 타임라인 탐색성 개선(이전/다음, 자동 중앙, 최신 선택)
5. 스크롤바/패널 스타일 glass 톤 통일

## 8. 비기능/성능 메모
1. 대량 트랙 처리 시 버블 샘플링 적용
2. 계산 비용 높은 작업은 Worker 분리
3. Resize 처리에 debounce 적용
4. 빌드 시 번들 경고 존재(>500kB chunk)

## 9. 테스트 체크리스트 (운영 전)
1. `/taste-map` desktop: map/bubble/3d 전환
2. Bubble 클릭 재생 시 카메라 고정 확인
3. Field Inspector 태그 토글/재토글 해제 확인
4. Time Story 이전/다음 + 카드 중앙 스크롤 확인
5. 모바일(`<=900px`) 탭 3종 동작 확인
6. Spotify 미인증/세션 만료 에러 처리 확인
