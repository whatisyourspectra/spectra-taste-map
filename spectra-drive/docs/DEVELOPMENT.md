# 개발 범위와 Pleos 연동 계획

기획 갱신: 2026-10-23. 목표는 **차량에서 손으로 편집하기 어려운 음악 리스트를, 기존 SPECTRA 취향 데이터와 음성으로 표현한 무드를 근거로 재구성하는 앱**이다. 조명·경로·위치는 확장 기능이다. 아래 SDK 문서 확인은 2026-10-22 기준이며 실제 접근 권한은 별도 확인이 필요하다.

현재 산출물은 웹 시제품이다. Gleo AI 등록, Pleos SDK 호출, Kotlin 앱 및 APK는 구현하지 않았다. 실행 가능한 웹 시연 흐름과 향후 네이티브 어댑터가 담당할 계약을 구분한다.

## 운전자 시점 데모

`/drive`에 아이오닉 6 실내 구성을 참고한 웹 렌더링을 추가했다. 현재 한강 노을의 AI 생성 배경과 실제 HTML 디스플레이를 합성하며, 모의 클러스터 옆 화면에서 실제 취향 분석·대기열 재선정·브라우저 음성 입력·연결한 로컬 음원 재생을 실행한다. 배경은 정적인 콘셉트이며 화면 확대·전체 화면 보기를 지원한다. 현재 곡과 기본 취향을 유지하고 다음 곡만 바꾸는 흐름이다. 기존 `src/taste/buildTasteState.js`를 직접 재사용한다. 샘플은 가상 데이터이며 실제 계정이나 차량과 연결되어 있지 않다.

첫 시연은 ‘기본 취향 → 편안하게 → 조금 더 신나게 → 기본 취향 복원’으로 구성한다. 조명·내비를 중심으로 한 아래 기존 기능은 확장용 시제품으로 유지한다.

`/pleos`는 공개된 Pleos Connect-S 17인치 배치 SVG를 실제 자산으로 사용한다. 시스템 UI와 앱 창을 분리하고 단독/1:1 분할 시안을 제공한다. 화면 모드가 바뀌어도 현재 곡과 로컬 재생을 유지한다. 템플릿 적용은 웹 시연의 표현 개선이며 SDK 연동 진척을 의미하지 않는다. [출처와 도안 좌표](design/pleos-connect/README.md)를 참고한다.

## SDK별 적용과 실제 연결 상태

| 기술 | 구현된 웹 동작 | 실제 네이티브 연결 시 할 일 |
| --- | --- | --- |
| Gleo Interface | 3개 function의 명령 처리, payload 해석, 결과별 callback 계약 | 앱 schema 등록·승인, Android Intent 수신, 실제 broadcast callback |
| SpeechToText | 브라우저 SpeechRecognition 입력과 제한된 문장 파서 | Pleos STT 입력 연결. Gleo 경유 명령은 Gleo의 해석 결과 사용 |
| TextToSpeech | 브라우저 음성 합성, 응답 소유자 분리 | 앱 자체 응답에만 Pleos TTS 사용. Gleo 경유 응답은 Gleo에 맡김 |
| Vehicle | capability별 쓰기 차단·오류 분기, 음악/조명 독립 조정, 실내 조명 시뮬레이션 | 조명 도메인의 capability·권한·색상/밝기 범위 확인 후 실제 setter·callback 연결 |
| NaviHelper | 목적지 좌표와 저장 장소 좌표 비교 후 퇴근 무드 제안 | 실제 목적지·경로 상태 이벤트를 전달. 내비가 없는 환경은 기능 비활성화 |
| FusedLocation | 지원 여부에 따른 영역 이탈 이벤트·무드 제안 시뮬레이션 | `isSupported()` 확인 후 위치·proximity API 연결, 미지원 시 제안 기능 제외 |
| 음악 재생 | 개인 취향에 연결한 로컬 오디오 파일을 HTMLAudioElement로 실제 재생 | 사용 가능한 음원 소스 확보, Media3/MediaSession 및 오디오 포커스 처리 |

조명·내비·위치 데이터는 `src/platform/simulator.js` 내부의 샘플이다. 모의 차량 상태에 따라 파일 가져오기와 조명 직접 조작을 제한하지만, 실제 `CarUxRestrictions` 연동은 아직 없다. 표준 기어·속도 데이터는 지원되는 AAOS Car API로 접근하고, Vehicle 전용 API와 구분한다.

## 첫 완성 시나리오

1. 출발 전에 개인 취향과 음악·조명 설정을 퇴근 모드로 저장한다.
2. 집으로 향하는 경로 또는 지원되는 위치 환경의 회사 이탈 이벤트가 퇴근 모드를 제안한다.
3. 사용자가 명시적으로 적용하면 음악 설정과 조명을 함께 요청한다. 제안만으로 재생하거나 조명을 바꾸지 않는다.
4. “음악만 조금 더 신나게. 조명은 그대로”는 음악 차원만 조정한다.
5. 조명 미지원·읽기 전용·오류에서는 음악 설정을 바꾸되 현재 조명은 바꾸지 않고 부분 결과를 안내한다.

저장한 값은 **요청 설정**, simulator의 `appliedLighting`은 **적용된 모의 값**이다. 실제 어댑터에서도 두 값을 구분하며 setter 완료 전에는 적용 성공으로 응답하지 않는다.

## 명령과 음성 응답 계약

| Function | Parameters | 동작 |
| --- | --- | --- |
| SET_MOOD | mood, target?: all/music/lighting | 기본 무드 또는 저장한 무드의 해당 대상을 적용 |
| ADJUST_MOOD | target: music/lighting, dimension, direction? 또는 color? | 음악 활기·밝기 또는 조명 밝기·색상을 조정 |
| SAVE_MOOD | name | 음악 설정과 요청 조명을 함께 저장 |

`integration/gleo/schema.json`은 미등록·미검증 초안이다. 최종 Android 앱의 `assets/schema.json`으로 옮기고 packageName을 확정해야 한다. 스키마는 최대 3개 function과 영어 description을 사용한다. 밝기·활기는 direction이 필요하고 조명 색상에는 color가 필요하며, 앱은 누락·부적합 인수를 재질문한다.

`src/platform/commands.js`의 callback은 웹에서 전송하지 않는 계약 미리보기다. `queue_updated`, `playing`, `unavailable`, `simulated`, `unsupported` 등을 구분한다. 음악 추천만 바뀌었는데 음원 재생 성공으로 보고하지 않는다. 조명 일부가 실패하면 callback은 `fail`과 부분 결과를 담는다. 모의 결과는 simulation 플래그를 포함한다.

음성 응답 주체는 한 번에 하나다. Gleo 기원 명령은 callback `mode=voice`로 Gleo가 응답하고 앱 TTS는 실행하지 않는다. 앱 내부 입력은 필요할 때 자체 TTS로 응답하고 callback 미리보기는 `silent`를 사용한다. 웹에서는 음성 입력·응답 중 로컬 재생 음량을 낮췄다가 원래 값으로 돌린다. Android에서는 시스템 오디오 포커스로 처리해야 한다.

## 실제 SDK 연결 전 확인할 것

2026-10-22 열람한 [호환성 페이지](https://document.pleos.ai/docs/pleos-only/vehicle-app-planning-guide/api-compatibility-availability)는 FusedLocation을 **차종별 지원, `isSupported()` 확인**으로 안내한다. 이전의 일괄 미지원 설명은 현재 기준으로 사용하지 않는다. NaviHelper도 내비게이션 탑재 여부에 따른다.

[프로젝트·SDK 신청 안내](https://document.pleos.ai/docs/pleos-only/create-my-project)에는 일부 제어·음성·위치 SDK의 준비 중 상태 안내가 남아 있다. 문서만으로 현재 계정에서의 접근 가능 여부를 확정하지 말고 My Project의 실제 SDK 상태를 확인해야 한다.

로컬에서 확인한 Java는 16이며 Android 플랫폼은 API 30이다. Gradle 실행 파일, Android Studio, Pleos system image는 확인하지 못했다. 현재 환경에서 네이티브 빌드·실행 검증은 수행하지 않았다.

## 다음 개발 순서

1. **Kotlin 앱과 Gleo 호출:** Android Studio 및 호환 JDK/Gradle 환경, 최소 API 28 이상 앱, Pleos API 34 에뮬레이터를 구성한다. 현재 계약을 Kotlin 상태 모델로 옮기고 `onCreate`/`onNewIntent`, action filter, callback 경로를 실제 payload로 검증한다.
2. **개인 취향 기반 음악 재생:** 데이터 가져오기와 재생 소스 연결, Media3/MediaSession, 오디오 포커스와 내비 안내 공존을 구현한다.
3. **지원 차량의 조명 연동:** capability에서 NONE/READ/WRITE/READ_WRITE와 범위를 확인하고 허용된 쓰기만 적용한다. setter 실패·권한 변경·연결 해제 시 적용된 상태를 보존한다.
4. **내비게이션 맥락:** 명시적으로 저장한 집/회사 좌표와 실제 목적지를 비교한다. 경로 변경·취소 시 이전 제안을 폐기하고 자동 재생하지 않는다.
5. **위치 기반 제안:** `isSupported()`와 접근 조건 확인 후 영역 이벤트를 등록한다. 미지원·위치 없음·권한 차단 시 수동 음성 및 경로 기반 무드 전환은 유지한다.
6. 실제 주행 제한 정책 연결, 네트워크 오류와 복원 동작 검증, APK 구동·시연 영상 준비.

## 검증

`npm test`: 음악/조명 독립성, 기존 저장 데이터 마이그레이션, 지원·권한·오류 분기, 좌표 기반 장소 식별, 제안의 무부작용, 위치 지원 분기, 응답 주체와 로컬 파일 매칭.

`tests/browser.mjs`: 무드 저장·복원, 별자리 좌표 유지, 경로 제안·수동 적용, 조명 읽기 전용 처리, 위치 지원 토글, 주행 시 가져오기 제한, 실제 WAV 재생, 반응형 화면. 브라우저 음성 입력 이벤트는 대역을 사용하며 실제 사람 발화·Pleos·Gleo·실차는 미검증이다.

## 공식 문서

- [공모전 개발 환경](https://appdevchallenge.auto-hmg.io/guide/development)
- [개발 환경 및 에뮬레이터](https://document.pleos.ai/docs/connect/guide/getting-started/application-development/setup-connect-sdk-emulator)
- [Gleo Interface](https://document.pleos.ai/docs/pleos-only/app-integration-guide/guide/core-concepts)
- [App Schema](https://document.pleos.ai/docs/pleos-only/app-integration-guide/guide/app-capability)
- [Callback Schema](https://document.pleos.ai/docs/pleos-only/app-integration-guide/guide/action_callback)
- [Vehicle SDK](https://document.pleos.ai/en/docs/pleos-only/connect-sdk-pleos/Vehicle/intro)
- [NaviHelper](https://document.pleos.ai/docs/pleos-only/connect-sdk-pleos/NaviHelper/intro)
- [FusedLocation](https://document.pleos.ai/en/docs/pleos-only/connect-sdk-pleos/FusedLocation/intro)
