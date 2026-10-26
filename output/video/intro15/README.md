# SPECTRA / Your taste. In spectra.

15초 브랜드 인트로. 랜딩 페이지의 실제 와이어 조형물, 그라데이션 워드마크, 앨범 버블, 별자리 지도를 기반으로 제작했습니다.

## 완성 파일

- `spectra-intro-15s-4k.mp4` — 3840×2160 / 30fps / H.264 / AAC stereo
- `spectra-intro-15s-1080p.mp4` — 1920×1080 / 30fps / 공유용
- `watch.html` — 브라우저에서 열어 소리와 함께 재생
- `spectra-intro-poster.jpg` — 대표 이미지
- `spectra-intro-storyboard.jpg` — 주요 장면
- `score.wav` — 직접 합성한 15초 스테레오 사운드 / 48kHz / 24-bit

## 구성

0–3.35초: 와이어 조형물 극접사와 카메라 풀백, **Your taste. In spectra.**

3.35–7.6초: 앨범 버블이 세 영역으로 정리. **좋아하는 음악이 나만의 지도가 됩니다.**

7.6–11.8초: 버블이 별자리로 전환되고 빛이 새로운 연결을 탐색. **취향을 잇고, 발견을 넓혀요.**

11.8–15초: 대형 워드마크, 슬로건, 서비스 주소. 마지막 2초 이상 로고 유지.

## 수정·재현

`film.js`에 시간별 모션과 타이포그래피가 있습니다. `render.mjs`는 설치된 로컬 Chrome과 Playwright를 사용합니다. 경로는 이 작업환경 기준이며 다른 컴퓨터에서는 Playwright import와 Chrome 경로를 조정하세요.

```sh
python3 output/video/intro15/generate_score.py
node output/video/intro15/render.mjs --preview
node output/video/intro15/render.mjs
output/video/render-env/bin/python output/video/intro15/finish.py
```

사이트 애플리케이션 코드와 배포 상태는 변경하지 않았습니다. 렌더는 브라우저의 실제 벡터·캔버스 프레임을 4K로 출력하며, 화면 녹화나 기존 30초 영상의 단순 편집이 아닙니다.
