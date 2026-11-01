# SPECTRA — Graphic Material Lab

2026-11-01 · 포스터 제작용 벡터 재료 60종 + A2 조합 예시 2종

**처음에는 `index.html`을 브라우저로 열어보세요.** 분류별 필터, 밝고 어두운 배경 전환, 개별 SVG / PNG 다운로드가 가능합니다. `CONTACT-SHEET.png`에는 전체 재료가 한 장에 정리되어 있습니다.

## 구성

| 폴더 | 구성 | PNG 긴 변 |
| --- | --- | --- |
| 01-hero | 하프톤 레코드·입체 토러스·취향 구름·별자리·등고선·탐색 경로, 10종 | 약 6,000 px |
| 02-type | 공식 워드마크, 아웃라인·확장형, 한글·영문 헤드라인, 이해·분류·확장, 11종 | 6,000–8,000 px |
| 03-tapes | 타이포 테이프, 체커보드, 좌표 눈금, 음파 스트립, 8종 | 8,000 px |
| 04-stickers | 장르 라벨, 취향 패스포트, 원형 실, 플레이 배지, 11종 | 4,096–6,000 px |
| 05-symbols | 음악 캐릭터 3종, 별, 궤도, 레코드, 지도 핀, 화살표 등 12종 | 4,096–5,001 px |
| 06-inverse | 밝은 바탕과 어두운 바탕에 맞춘 반전 컬러, 8종 | 6,000 px |
| 07-layout-examples | 어두운 콜라주 / 밝은 취향 아틀라스 A2 포스터, 2종 | 약 4,961 × 7,016 px |

같은 이름의 SVG와 PNG는 같은 재료입니다. 총 **SVG 62개 + PNG 62개**이며, 갤러리 미리보기·모아보기는 별도입니다. `manifest.json`에 각 파일의 실제 픽셀 크기와 투명 배경 여부가 기록되어 있습니다.

## SVG / PNG 사용

- SVG는 점, 선, 도형과 글자 패스로 구성된 **실제 벡터**입니다. PNG를 SVG 안에 넣은 파일이 아닙니다. Illustrator, Figma, Affinity Designer 등에서 확대·색상 변경·분해가 가능합니다.
- 모든 글자는 윤곽선으로 변환되어 폰트가 없어도 동일하게 보입니다. 문구 자체를 고치려면 새 글자를 입력하거나 생성 소스를 수정하세요.
- PNG는 저해상도 그림을 확대하지 않고 벡터에서 직접 렌더링했습니다. 개별 재료 60종은 투명 배경입니다. 흰색·밝은 선 재료는 검정 배경 위에서 확인하세요.
- PNG는 RGB입니다. 실제 인쇄 시 출력 업체의 색상 프로파일과 도련 규격을 적용하세요. PNG는 픽셀 크기로 배치하고 자동 인쇄 크기에 의존하지 마세요.
- A2 조합 SVG는 420 × 594 mm입니다. 같은 이름의 PNG는 이 크기에 약 300 ppi로 배치할 수 있습니다. 예시는 재료 조합을 보여주며 도련과 학교 공식 로고는 포함하지 않았습니다.
- 지도, 좌표 눈금, 장르 표기와 패스포트 번호는 설명용 그래픽입니다. 실제 사용자 데이터나 분류 결과, 서비스 화면 캡처가 아닙니다.

## 추천 조합

1. **검정 콜라주:** `03-torus-halftone-lilac` + `12-wordmark-white` + `22-tape-music-white` + `25-tape-spectrum` + `53-type-korean-hero-white`
2. **밝은 취향 지도:** `02-orbit-halftone-ink` + `05-constellation-ink` + `23-tape-taste-lilac` + `31-genre-dream-pop`
3. **플레이풀 음악 정체성:** `44-buddy-headphones` 또는 `45-buddy-vinyl` + `30-taste-passport` + `39-badge-press-play` + `26-checker-strip-white`

## 디자인 기준 / 출처

사용자가 첨부한 무드보드의 큰 타이포, 검정·라일락 배색, 하프톤, 리본과 스티커를 참고해 SPECTRA의 음악 지도·취향 연결·발견 개념으로 새로 그렸습니다. [Behance 링크](https://www.behance.net/gallery/241557113/-MASK-EMOJI-)는 열리지 않아 해당 프로젝트의 내부 내용을 확인하거나 이미지·캐릭터를 추출하지 않았습니다.

SPECTRA 공식 워드마크의 경로는 이 저장소의 `public/spectra-wordmark.svg`를 사용했습니다. 색과 비율을 달리한 그래픽 변형은 공식 로고 사용 규정을 대신하지 않습니다. 새로 그린 캐릭터 3종은 이 재료 모음의 제안이며 제품에 적용된 캐릭터는 아닙니다.

- 기본 색상: Ink #171719 / Paper #F7F5EF / Lilac #CEC2FF / Pink #ED70BC / Cyan #70D6FF
- 보조 색상: Purple #9B80F7 / Acid #EEFF79
- 영문 글꼴 윤곽선: 프로젝트에 포함된 Syne ExtraBold / SemiBold
- 한글 글꼴 윤곽선: 로컬 설치 KoPubWorld Dotum Bold
- 도구: 코드로 직접 작성한 SVG + OpenType 글자 윤곽선 + resvg PNG 렌더링. 생성형 이미지 API는 사용하지 않았습니다.

`build-kit.mjs`는 현재 SPECTRA 저장소 안에서 재생성하는 소스입니다. 실행에는 저장소의 three/opentype, 위 글꼴과 로컬 resvg가 필요합니다. 배포된 SVG·PNG·갤러리는 생성 도구 없이 사용할 수 있습니다.
