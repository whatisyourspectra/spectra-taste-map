# SPECTRA Drive — 발표·시연용 소개 영상

- `spectra-drive-intro-30s-1080p.mp4`: 1920×1080, 30초, 30fps, H.264 / AAC 스테레오.
- `watch.html`: 브라우저 재생 화면.
- `spectra-drive-poster.jpg`: 대표 이미지.
- `spectra-drive-storyboard.jpg`: 완성 영상의 주요 장면 6개.
- `production-notes.json`: 화면 출처, 구현 범위, 검증 결과.

## 구성

| 구간 | 내용 |
| --- | --- |
| 0–5초 | 한강 노을 운전자 시점과 핵심 가치 |
| 5–10.5초 | “퇴근길이니까, 좀 편안하게” 예시 요청과 대기열 변경 |
| 10.5–15.5초 | 현재 곡과 취향 별자리는 유지하고 다음 곡만 재선정 |
| 15.5–21.5초 | “조금 더 신나게” 예시 요청과 무드 전환 |
| 21.5–26.5초 | Pleos 단독 화면과 내비·음악 분할 화면 시안 |
| 26.5–30초 | SPECTRA Drive 브랜드 마무리 |

## 화면과 소리

실제 `spectra-drive` 앱의 요청 예시 버튼을 조작해 캡처했습니다. 현재 곡과 별자리 좌표 유지, 대기열 변경을 `sources/capture-audit.json`에 기록했습니다. 촬영용 스타일로 외부 시연 조작 버튼과 중복 장면 문구만 숨겼으며 앱 소스는 변경하지 않았습니다. 영상의 확대·전환·강조는 캡처 위에 합성한 프레젠테이션 모션입니다.

운전자 배경은 프로젝트에 있던 AI 생성 콘셉트 이미지입니다. Pleos 화면은 기존 디자인 가이드 기반 웹 시안이며 실제 차량, Gleo, 네이티브 Pleos 앱과 연동하지 않았습니다. 시연 곡의 상용 음원은 재생하지 않습니다.

배경음은 기존 SPECTRA 오리지널 신스 스코어를 사용했습니다. 요청 예시 두 개는 macOS Yuna 합성 음성으로 제작했으며, 마이크로 인식한 실제 발화가 아닙니다. 해당 장면에 예시·합성 음성임을 표시했습니다.

## 재현

1. `spectra-drive`에서 `npm run dev`로 로컬 시제품을 실행합니다.
2. 저장소 루트에서 `node output/video/drive-intro/render.mjs --preview`로 장면을 검토합니다.
3. `node output/video/drive-intro/render.mjs`로 MP4를 렌더링합니다.
4. `output/video/render-env/bin/python output/video/drive-intro/finish.py`로 디코딩·프레임·음량을 검증하고 대표 이미지와 스토리보드를 만듭니다.

현재 작업환경의 Chrome, Playwright, Python 및 macOS 음성을 사용합니다. 다른 환경에서는 `PLAYWRIGHT_MODULE`, Chrome 경로와 음성 생성 부분을 조정해야 합니다. 대용량 미디어는 Git의 생성 파일 제외 규칙에 따라 로컬에 보관합니다.
