# SPECTRA Drive / Pleos Connect Study 04

공식 자료 확인: 2026-10-23. 실행: `npm run dev` 후 http://127.0.0.1:5190/pleos . 기존 한강 운전석은 `/drive`에서 보거나 상단 보기 버튼으로 전환한다. 앱 내부 상태와 로컬 오디오는 두 보기 사이에서 유지된다.

## 적용한 템플릿

Pleos Connect-S 17인치의 공식 16:9 배치를 사용한다. 상단 상태바, 왼쪽 Driving View, 하단 GNB와 나머지 앱 영역을 구분한다. SPECTRA 단독 또는 내비게이션 예시와 SPECTRA의 1:1 분할을 지원한다. 별자리·현재 곡·대기열·음성 응답은 SPECTRA 앱 창 내부에서만 표시한다. 세로 앱 창에서는 별자리와 대기열을 위아래로 재배치한다.

이번 구현은 공식 Figma 문서를 웹에서 직접 실행하거나 Android UI 라이브러리를 연결한 것이 아니다. 공식 문서의 시스템 UI SVG에서 해당 프레임을 추출해 사용하고, 작동하는 SPECTRA 앱을 HTML로 합성한 웹 프로토타입이다. 상단 상태바와 주행 시각화는 동작 상태를 표시하기 위해 별도로 그렸다. 공식 하단 아이콘 위에 SPECTRA 즐겨찾기와 앱 라이브러리 버튼을 배치했다.

## SPECTRA 앨범 커버와 더미 데이터

기존 `src/taste/demoUniverses.js`의 데모 3종에서 6곡씩 18곡을 가져오고, 원본 `public/demo-covers/`의 커버 17종을 그대로 사용한다. `src/taste/demoCoverAssets.js`의 곡-커버 대응을 공유한다. 세션 무드 수치는 원본의 데모 예시값이며 실제 음악 분석이나 개인 청취 이력이 아니다. 오디오 파일은 포함하지 않는다.

단독 창에는 현재 곡의 큰 커버와 앨범 정보를 표시하고 대기열·플레이어에도 일치하는 커버를 넣었다. 분할·운전석 보기나 다음 곡으로 바꿔도 이미지가 해당 곡을 따른다. 개인 JSON의 커버 필드를 보존하며 실패 시 원본 `demoArtwork.js`의 SVG 아트를 사용한다. 외부 커버 검색 API는 호출하지 않는다. 자산은 `predev`·`prebuild`에서 동기화하고, `public/spectra-demo.json`으로 더미 데이터를 내려받을 수 있다. 원본 커버 출처 기록은 `public/demo-covers/sources.json`에 있다.

## 공식 출처와 다운로드

- [Pleos Connect UI Design Guide 및 디자인 리소스](https://document.pleos.ai/en/docs/connect/guide/docs-design/Introduction/intro)
- [Display Layout](https://document.pleos.ai/en/docs/connect/guide/docs-design/getting-started/layout)
- [Window Policy](https://document.pleos.ai/en/docs/connect/guide/docs-design/getting-started/window)
- [공식 디스플레이 Figma 파일 v2.1.5](https://document.pleos.ai/img/Pleos_Connect_display_guide_215.fig)
- [공식 디자인 자산 Figma 파일 v2.1.5](https://document.pleos.ai/img/Pleos_Connect_design_assets_215.fig)
- [이번 웹 시안에 사용한 공식 배치 SVG](https://document.pleos.ai/en/assets/images/pleos_connect_deisgnguide_displaylayout_03-bca8a53d11c851ca8fe3c8ea3fcaf6fa.svg)

시스템 도안 출처 및 권리: Hyundai Motor Group / Pleos Playground. 앱 브랜드·별자리·음악 로직은 기존 SPECTRA 자산이다. Figma 파일은 공개 다운로드를 확인했으며 프로젝트에 대용량 원본을 포함하지 않았다.

## 도안 추출

`public/pleos/connect-s-17-landscape.svg`, `connect-s-17-split.svg`는 공식 SVG의 각각 `clip6_0_1`, `clip20_0_1` 그룹과 참조 definitions를 보존한다. 이미지 생성 모델로 Pleos 시스템 도안을 재현하지 않았다.

다시 만들려면 공식 배치 SVG를 다운로드한 뒤 `python3 scripts/extract-pleos-template.py /path/to/downloaded.svg`를 실행한다. 2560 × 1440은 원본 도안 내부의 좌표계이며 모든 실제 기기의 해상도나 dp 값이라는 의미는 아니다.

앱의 영역은 원본 도안 좌표를 기준으로 다음과 같이 배치했다.

| 영역 | 원본 프레임 내 위치 |
| --- | --- |
| 단독 앱 | x 840, y 96, width 1700, height 1184 |
| 분할 내비 | x 840, y 96, width 840, height 1184 |
| 분할 SPECTRA | x 1700, y 96, width 840, height 1184 |

## 실제 동작과 모의 동작

실제 동작: 개인 JSON 불러오기, SPECTRA 취향 분석, 무드에 따른 다음 곡 재선정, 브라우저 음성 입력, 연결한 로컬 음원 재생, 앱 창 배치 전환, 시연용 앱 라이브러리.

모의 표시: 속도·기어·배터리·네트워크·시계·주행 보조·공조·내비 경로. 하단 시스템 아이콘 대부분은 공식 도안에 포함된 시각 자료이며 차량 기능을 호출하지 않는다. SPECTRA와 라이브러리 버튼은 웹 시연 범위에서 동작한다. Gleo·Pleos SDK·NaviHelper·Android 앱 설치와 연결하지 않았다.

아이오닉 6 실내를 참고한 기존 운전석 이미지는 배경으로만 사용한다. 공식 Connect-S 17인치 화면은 별도 확대 보기로 제공한다. 이 조합이 아이오닉 6의 실탑재 사양이라는 주장은 하지 않는다. 자동차 화면의 실제 크기, 거리, 글자 가독성 및 주행 제약은 네이티브 환경에서 별도로 검증해야 한다.

## 캡처와 검증

- `01-connect-s-single.png`: 공식 시스템 도안 + SPECTRA 단독
- `02-connect-s-split.png`: 내비 예시 + SPECTRA 세로 창
- `03-split-mood-updated.png`: 세로 창에서 음악 활기 조정 후 대기열 변경

`npm test`, `npm run build`와 `tests/pleosBrowser.mjs`로 확인한다. 브라우저 검증은 공식 SVG 로딩, 시스템 영역 확보, 앱 내부 잘림, 분할 비율, 보기 전환 시 대기열 유지, 음성 이벤트 어댑터, 라이브러리 동작, 320~1600px 페이지 가로 넘침, 실제 WAV 재생 중 창 배치·운전석 전환을 확인한다. 실제 마이크·Pleos SDK·차량은 검증하지 않는다.
