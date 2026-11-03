# SPECTRA — Your Music Taste Map

**Graduation project presentation · Revised November 3, 2026**

**Target: approximately 7 minutes, including live interactions.**

Read the paragraphs aloud. Bracketed directions are presentation cues, not spoken text. Timings are rehearsal targets rather than measured durations.

## 01. Introduction with Poster — 0:00–1:40

[Show the poster. Point to Understand → Cluster → Expand when introducing the three actions.]

Hello, professors. My graduation project is **SPECTRA: Your Music Taste Map**.

As we keep saving music, our collections grow. But a long list of songs tells us very little about how those songs relate to each other, or what connects them to our taste.

I started with this question: **How can we turn a music collection into something people can explore and understand?**

SPECTRA is a working web service that transforms an imported song collection into a personal, interactive map.

The experience follows three actions: **Understand, Cluster, and Expand**.

Understand helps users see the shape of their collection. Cluster makes its different areas readable. Expand lets users choose a starting point and explore new music from there.

During development, I also focused on what happens after that first exploration. The project now includes a mobile experience for everyday listening and reflection, and a first Social prototype for sharing taste and starting conversations.

The goal is to make accumulated music feel like a personal space that users can return to, navigate, and gradually develop.

## 02. Main Page Walkthrough — 1:40–3:50

[Show the landing page and import section briefly, then move to a prepared personal Taste Field. Describe the features here; save the clicks for the live demo.]

Users can begin by pasting song titles and artists, or uploading a CSV or text file. Demo maps let them try the experience first. Signing in allows them to keep their personal map in their account.

In the **Taste Field**, each bubble is a song. Users can move through the map, zoom into an area, select tracks, and listen.

The current system uses available genre tags from Last.fm and Spotify. These are metadata-based clues for exploration, and their quality can vary.

One important design update was making the genre filters cover the entire collection. There are now **at most fifteen groups**. Every imported song belongs to one representative group, and the counts add up to the full collection.

When there are too many small genres, related ones share a broader category. Songs with insufficient information remain visible in an explicit unknown category. This keeps the filters manageable while making every song accessible.

Users can also view songs as a **constellation** and follow a listening route between them. The connecting lines support navigation through the collection.

To expand their taste, users choose a song and request related music. They can explore the results and decide which tracks to add to their map.

This creates a cycle: **explore my collection, find something new, and bring it back into my own space**.

## 03. Live Demo — 3:50–6:30

### A. My map and genre groups

[Start with a prepared personal map. Select one genre tag.]

Let me show that cycle with my own map.

Here is the collection I imported. I’ll select one of the genre tags. Its count tells me how many songs belong to this area, and I can return to the complete map at any time.

### B. Constellation and discovery

[Open a song’s details. Switch to Spectra, enter a constellation, and briefly show its queue.]

Now I’ll select a song, open its details, and switch to the constellation view. I can follow the route and choose another song from the play queue.

[Open discovery from a song. Use a prepared result; add one track if the presentation account is ready.]

From this song, I’ll open discovery. I can request related tracks, keep browsing the results, and add a track I want to keep. It becomes part of my collection.

### C. Mobile: everyday exploration and reflection

[Switch to a prepared mobile window or phone. Show My Map, the immersive overview, Discover, and a previously saved Today entry.]

On mobile, I’ve made the experience more suited to short, everyday visits.

In **My Map**, I can browse songs or open an immersive overview of my Spectra. In **Discover**, I can add a song to my music, mark it as interesting, or skip it.

The **Today** tab lets me choose a listening mood, select a song, and save the moment in a calendar.

### D. Social: a first prototype

[Show a prepared Social profile and an existing comment. A screenshot is sufficient if the latest Social build is not running.]

Finally, this is the first **Social prototype**. Users can publish a chosen snapshot of their taste, including a genre profile and optional representative songs. Other signed-in users can leave comments. The owner can update the snapshot or make it private again.

This adds a social layer while letting users decide what they share.

## 04. Closing — 6:30–7:00

[Return to the poster or a clean overview of the personal map.]

SPECTRA brings **Understand, Cluster, and Expand** into one experience, connecting music exploration with everyday reflection and conversation.

My next step is to develop **taste comparison**: helping two people see where their music overlaps and where it differs. I also want to evaluate the genre groupings with more real collections.

Thank you.

---

## Presenter Notes — 발표 전 확인용, 읽지 않는 부분

### 기존 대본에서 바꾼 점

- **분류의 실제 역할:** “음악적 특성이 비슷한 곡을 정확하게 분석한다”는 인상 대신, 이용 가능한 장르 메타데이터를 바탕으로 탐색을 돕는다고 설명합니다.
- **최대 15개 완전 분류:** 일부 인기 태그만 보여주는 방식에서, 정보 부족 곡까지 모든 고유 곡이 하나의 대표 영역에 속하는 방식으로 바뀐 점을 담았습니다. 15개가 고정된 세부 장르 목록이라는 뜻은 아닙니다.
- **모바일을 현재 결과로 소개:** My Map, 몰입형 취향 둘러보기, Discover의 추가·관심·넘기기, Today의 무드 선택과 달력 기록을 현재 구현 내용으로 설명합니다.
- **Social의 현재 범위:** 선택적 공개 스냅샷, 대표곡 공개 선택, 코멘트, 공개 해제까지 첫 프로토타입으로 설명합니다. 취향 유사도 점수는 다음 단계로 분리했습니다.
- **구체적인 연구 수치나 성과는 추가하지 않음:** 인터뷰 인원, 만족도 개선, 추천 정확도 같은 확인되지 않은 수치를 넣지 않았습니다. 실제 연구 근거가 있다면 Introduction의 문제 제기 뒤에 한 문장만 추가하세요.

### 7분 안에 시연하는 순서

| 화면 | 권장 조작 | 주의할 점 |
| --- | --- | --- |
| 개인 지도 | 태그 하나 선택 → 곡 하나 선택 | 실제 개인 음악을 준비하고 화면에 나온 곡 수를 사용합니다. 1,932곡 등 예전 수치를 고정해 말하지 않습니다. |
| Spectra / 별자리 | 별자리 진입 → 큐에서 곡 하나 선택 | 실제 UI에서 가능한 진입 순서를 미리 연습합니다. 선을 객관적인 음원 유사도라고 설명하지 않습니다. |
| 새 음악 찾기 | 결과 확인 → 곡 하나 추가 | 네트워크 요청이 길어질 경우를 대비해 결과 화면이나 짧은 녹화를 준비합니다. |
| 모바일 | My Map → 몰입형 둘러보기 → Discover → Today 달력 | Today 전체 과정을 현장에서 처음부터 진행하지 말고, 저장된 기록을 보여줍니다. |
| Social | 공개 프로필 → 기존 코멘트 | 개발 코드가 실제 시연 환경에 반영됐는지 확인합니다. 로컬 구현·DB 연결 확인과 운영 배포 완료는 별개입니다. |

전체 대본은 약 110–120 words/min 속도의 발화와 화면 조작 시간을 고려한 초안입니다. 직접 읽으며 시간을 재고, 클릭이 길어지면 별자리 큐 조작과 Today의 중간 단계를 줄이세요.

### 정확하게 구분할 내용

- **개인 지도 저장:** 로그인한 개인 지도는 계정 저장을 지원합니다. 비로그인 지도는 브라우저에 보관됩니다.
- **Today 기록:** 현재 브라우저에 보관됩니다. 모든 일기 기록이 계정으로 동기화된다고 말하지 않습니다.
- **가져오기:** 곡 목록 붙여넣기 또는 CSV/TXT 파일입니다. Spotify 로그인만으로 개인의 좋아요 전체 목록을 자동 수집한다고 설명하지 않습니다. 현재 한 번에 최대 5,000곡을 지원합니다.
- **음악 정보:** Last.fm 곡·아티스트 태그와 이용 가능한 Spotify 아티스트 장르 등을 사용합니다. 두 뷰가 동일한 원본 태그를 사용하는 것은 아닙니다. 무드·에너지 수치는 태그 기반 추정값일 수 있습니다.
- **분류:** 현재 불러온 고유 곡 집합을 최대 15개로 나눕니다. 한 곡의 원본 태그가 하나로 바뀌는 것은 아닙니다. 정보가 없는 곡은 별도 분류에 남습니다.
- **Social:** 사용자가 직접 공개하는 스냅샷입니다. 대표곡은 선택 사항이며 최대 24곡입니다. 개인 지도 변경이 자동으로 공개 내용에 반영되는 방식은 아닙니다.
- **다음 단계:** 사람 간 취향 비교 점수와 그 정확도 검증은 아직 구현 완료된 결과로 소개하지 않습니다.

### Optional Short Answers — 예상 질문용

**How are the songs grouped?**

The current version uses cleaned genre metadata and explicit genre relationships. It creates up to fifteen navigation groups that cover the imported collection. Every song has one representative group, while its original tags are preserved. This is a practical classification rule that still needs evaluation with more real libraries.

**What do the constellation lines mean?**

They provide routes between nearby points in the layout so users can move through the collection. I do not present them as measured acoustic similarity or proof that two songs sound alike.

**What does mobile add to the project?**

Desktop supports a broad spatial overview. Mobile supports shorter visits: browsing my music, reacting to new songs, and keeping a small record of a listening moment.

**What is the next step after Social?**

The first step is letting people choose what to share and respond through comments. Next, I want to compare their genre profiles and show both shared interests and differences. A reliable comparison score still needs to be designed and tested.
