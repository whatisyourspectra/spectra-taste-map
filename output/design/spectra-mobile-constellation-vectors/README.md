# 모바일 스펙트라 그래픽 · SVG 원본

스크린샷의 중앙 별자리 그래픽을 포스터 재료로 쓸 수 있도록 만든 정적 벡터 예시입니다. UI 문구·버튼은 포함하지 않았습니다.

## 바로 사용하기

첨부 이미지처럼 여러 색의 별이 밀집한 예시는 `svg/09-spectra-dense-example.svg`를 사용하세요. 어두운 배경까지 포함된 버전은 `10-spectra-dense-example-dark.svg`입니다.

실제 현재 프로젝트의 데모 데이터로 만든 기본 예시는 `01-spectra-glow-transparent.svg`와 `02-spectra-glow-dark.svg`입니다.

`START-HERE.html`에서 열어 비교한 뒤 원하는 파일을 다운로드할 수 있습니다. Figma나 Illustrator로 SVG를 가져오면 선·별·장르별 빛 번짐을 편집할 수 있습니다.

## 구성

| 번호 | 내용 |
| --- | --- |
| 01 | 기본 별자리, 투명 배경 |
| 02 | 기본 별자리, 어두운 배경 |
| 03–04 | 같은 데이터의 다른 회전 구도 |
| 05 | 빛 번짐 없는 컬러 인쇄용 |
| 06 | 빛 번짐 없는 흰색 단색, 어두운 배경용 |
| 07 | 별과 빛 번짐만 분리 |
| 08 | 연결선만 분리 |
| 09 | 다양한 장르가 섞인 밀집 예시, 투명 배경 |
| 10 | 밀집 예시, 어두운 배경 |

각 버전은 SVG와 4096×4096px PNG로 제공됩니다. SVG의 4096 표시는 기본 표시 크기이며 벡터 형상은 자유롭게 확대할 수 있습니다. 글꼴, 외부 CSS, 외부 이미지에 의존하지 않습니다. 모든 별은 원과 패스, 연결은 선, 빛 번짐은 방사형 그라디언트입니다. 래스터 이미지를 SVG 안에 넣은 방식이 아닙니다.

SVG 그룹은 `region-auras`, `connections`, `stars`로 나뉩니다. 01·07·08은 같은 좌표와 프레임이므로 겹쳐서 조합할 수 있습니다. 정지 이미지를 위한 것으로 앱의 숨쉬기·반짝임 애니메이션은 포함하지 않았습니다.

## 데이터와 재현 범위

앱의 `src/taste/buildTasteState.js`, `src/avatar/buildAvatarState.js`, `src/reflection/projectSpectra.js`를 직접 호출했습니다. 형태·연결·색상 계산은 제품과 같은 함수입니다. 표현은 `LivingConstellationAvatar.jsx`의 원·선·그라디언트 및 기본 불투명도를 정적 SVG로 구성했습니다.

- 01–08은 현재 실제 데모 라이브러리 69곡으로 만든 예시입니다.
- 09–10은 Electronic·House·Pop 중심의 13개 장르에 배분한 가상의 디자인 샘플 72개입니다. 실제 사용자 음악이나 분석 결과로 주장하지 않습니다.
- 첨부 이미지의 개인 라이브러리 1,932곡 데이터에는 접근하지 않았으므로 그 화면과 정확히 같은 별 위치를 복원한 파일은 아닙니다.
- `sources/`의 JSON에 생성 입력을 설명하는 정보와 별·연결·장르 영역 좌표를 보관했습니다.

## 재생성

`node output/design/spectra-mobile-constellation-vectors/build.mjs`

SVG 생성은 Node와 프로젝트의 순수 계산 함수를 사용합니다. PNG는 `/private/tmp/spectra-poster-tools/node_modules/@resvg/resvg-js`로 네이티브 렌더링합니다. 다른 환경에서는 이 경로를 수정해야 합니다. 제품 코드는 수정하지 않았습니다.
