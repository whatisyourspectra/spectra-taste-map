# SPECTRA A0 포스터 이미지 재료

기존 랜딩 페이지의 그래픽을 인쇄용으로 다시 렌더링한 이미지 10종입니다. 같은 번호의 PNG와 SVG는 같은 그림입니다.

| 파일 | 용도 | PNG 크기 | 배경 |
| --- | --- | --- | --- |
| 01-wire-sculpture-transparent | 메인 와이어 조형 | 6000 × 5250 | 투명 |
| 02-wire-ribbon-transparent | 가로형 와이어 리본 | 7000 × 2567 | 투명 |
| 03-main-hero-dark | 로고·조형·문구 메인 비주얼 | 7000 × 4250 | 어두운 배경 |
| 04-taste-journey-dark | 이해·분류·확장 설명 | 7200 × 2756 | 어두운 배경 |
| 05-album-atlas-transparent | 장르별 취향 지도 | 6000 × 5000 | 투명 |
| 06-constellation-transparent | 음악 연결·별자리 | 6000 × 4000 | 투명 |
| 07-genre-portals-transparent | 장르별 포털 3개 | 7200 × 2133 | 투명 |
| 08-a0-content-background | A0 비율 무문자 배경 | 4967 × 7022 | 어두운 배경 |
| 09-spectra-wordmark | 기존 공식 워드마크 | 7200 × 660 | 투명 |
| 10-service-qr | 서비스 접속 QR | 1800 × 1800 | 흰 배경 |

## A0에 배치하기

- 대형 인쇄와 Illustrator/Figma 배치는 SVG를 우선 사용하세요. 와이어·연결선·워드마크는 벡터이며, 앨범 커버는 원본 JPG가 포함되어 있습니다.
- 투명 PNG는 배경 위에 바로 올릴 수 있습니다. 밝은 선과 글자는 어두운 배경에서 가장 잘 보입니다.
- `A0-layout-example.svg`는 **841 × 1189mm** 실제 A0 크기의 배치 예시입니다. `A0-layout-example.png`는 **2523 × 3567px**의 배치 검토용 이미지입니다.
- 첨부 템플릿의 중앙 영역을 참고해 상단 메인 조형, 중앙 설명, 하단 이해·분류·확장 순서로 구성했습니다.
- 배치 예시의 `KAIST id`는 로고 위치를 나타내는 텍스트입니다. 제출용 작업에는 제공된 원본 템플릿의 학교 로고·헤더·서명을 그대로 사용하세요.
- SVG 한글은 Apple SD Gothic Neo, 영문은 Syne입니다. PNG에는 글자가 이미지로 포함되어 있습니다.
- QR에는 `https://spectra-music.org`가 들어 있습니다. QR의 흰 여백을 유지하세요.

## 차용한 원본

- `src/pages/LaunchTasteMapHero.jsx`: 와이어 조형의 3D 수식과 색상. 인쇄를 위해 96가닥 / 360샘플의 벡터 선으로 재생성했습니다.
- `src/pages/LaunchTasteJourney.jsx`: 18곡 지도 배치, 이해·분류·확장, 장르 포털.
- `public/demo-covers/*.jpg`: 파일을 확인한 실제 데모 앨범 커버. 빈 커버·로딩 자리표시자는 사용하지 않았습니다.
- `public/spectra-wordmark.svg`: 기존 공식 워드마크.

지도·별자리 재료는 서비스 개념을 설명하는 일러스트이며, 실제 서비스 화면 캡처가 아닙니다.

## 미리보기

- `asset-contact-sheet.png`: 이미지 재료 모아 보기
- `A0-layout-example.png`: A0 포스터 배치 예시
- `build-kit.cjs`: 재생성 스크립트. 현재 작업환경의 로컬 라이브러리 경로를 사용합니다.
