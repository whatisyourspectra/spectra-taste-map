// Teach the controls available on the current device.
export function helpTopics(en, mobile) {
    const t = (ko, english) => en ? english : ko;
    return [
        {
            id: 'start', icon: 'upload', label: t('시작', 'Start'),
            title: t('듣던 음악을, 내 지도로', 'Your music, on your map'),
            description: t('어디서 듣든 괜찮아요. 곡 목록 파일 하나면 시작할 수 있어요.', 'Bring a track list from the service you already use.'),
            steps: [
                [t('플레이리스트 내보내기', 'Export a playlist'), t('Spotify · Apple Music · YouTube Music 중 이용하는 서비스를 골라요.', 'Choose Spotify, Apple Music, or YouTube Music in the import guide.')],
                [t('CSV 또는 TXT 파일 올리기', 'Upload a CSV or TXT file'), t('다운로드한 파일을 올려요. 곡 목록을 붙여넣어도 좋아요.', 'Upload the downloaded file, or paste a list of songs.')],
                [t('내 지도 열기', 'Open your map'), t('곡 정보가 연결되면 나만의 취향 지도가 만들어져요.', 'Your songs become a personal map as their information is matched.')],
            ],
            note: t('음악 서비스 로그인은 내보내기 도구에서 진행해요. SPECTRA 로그인과는 별개예요.', 'Sign in to your music service in the export tool. This is separate from your SPECTRA account.'),
        },
        {
            id: 'map', icon: 'map', label: t('지도', 'Map'),
            title: t('곡 하나에서 탐색을 시작해요', 'Start with a song you love'),
            description: t('닮은 곡은 가까이 모여 있어요. 내 취향의 여러 영역을 둘러보세요.', 'Similar songs sit close together. Explore the different sides of your taste.'),
            steps: [
                [t('곡을 눌러 정보 보기', 'Select a song'), t('앨범이나 별을 누르면 곡명과 아티스트를 확인할 수 있어요.', 'Tap an album or a star to see the song and artist.')],
                [t('장르별로 좁혀 보기', 'Explore one genre'), t('상단의 장르 태그를 누르면 그 장르의 곡만 볼 수 있어요.', 'Choose a genre at the top to focus on its songs.')],
                mobile
                    ? [t('두 가지 모습으로 둘러보기', 'Switch your view'), t('별자리와 앨범 버블을 바꿔 보세요. 두 손가락으로 확대할 수 있어요.', 'Switch between constellations and album bubbles. Pinch to zoom in.')]
                    : [t('별자리 항해 시작하기', 'Start a constellation voyage'), t('곡 정보의 ‘별자리 항해’를 누르면 연결된 곡을 따라갈 수 있어요.', 'Choose “Constellation voyage” in the song panel to follow its connections.')],
            ],
            note: mobile
                ? t('곡 목록은 하단 패널을 위로 올리면 볼 수 있어요. 검색으로 곡을 바로 찾아보세요.', 'Swipe the bottom panel up to see your songs, or search for a song directly.')
                : t('휠로 확대하고, 빈 공간을 드래그해 이동해요. 하단의 퍼센트를 누르면 전체 지도로 돌아와요.', 'Scroll to zoom and drag empty space to move. Select the zoom percentage to see the whole map.'),
        },
        {
            id: 'discover', icon: 'discover', label: t('발견', 'Discover'),
            title: t('마음에 들면, 내 지도에 쏙', 'Add your next favorite to your map'),
            description: t('좋아하는 곡에서 출발해, 다음에 좋아할 음악을 찾아보세요.', 'Let a favorite song lead you to your next discovery.'),
            steps: [
                [t('기준이 될 곡 고르기', 'Choose a starting song'), mobile
                    ? t('곡 정보에서 ‘비슷한 곡 찾기’를 눌러요.', 'Choose “Find similar songs” from a song’s details.')
                    : t('곡을 선택해 확장하거나, 하단의 ‘새 음악 찾기’를 눌러요.', 'Explore from a selected song, or choose “New music” in the bottom toolbar.')],
                [t('추천 곡 먼저 들어보기', 'Give a recommendation a listen'), t('곡 정보를 열어 음악을 듣고 마음에 드는지 확인해요.', 'Open the song’s details and listen before deciding.')],
                [t('내 지도에 추가하기', 'Add it to your map'), mobile
                    ? t('‘내 음악에 추가’를 누르면 내 지도에 함께 저장돼요.', 'Choose “Add to my music” to keep the song in your map.')
                    : t('추천 곡의 +를 누르면 닮은 곡 옆에 자연스럽게 합쳐져요.', 'Select + on a recommendation. It joins the map beside similar songs.')],
            ],
            note: t('추가한 곡은 내 지도에 남아요. Spotify나 Apple Music 플레이리스트에는 자동으로 추가되지 않아요.', 'Added songs stay in your SPECTRA map. They are not automatically added to a streaming playlist.'),
        },
        {
            id: 'share', icon: 'social', label: t('공유', 'Share'),
            title: t('나의 취향을, 함께 나눠요', 'Share your taste with others'),
            description: t('소셜에서 내 취향을 공개하고, 서로의 음악에 이야기를 남겨보세요.', 'Publish your taste in Social and leave comments on each other’s music.'),
            steps: [
                [t('로그인해 내 음악 저장하기', 'Sign in to keep your music'), t('로그인하면 이 브라우저의 지도를 계정에도 저장할 수 있어요.', 'Sign in to save this browser’s map to your account too.')],
                [t('소셜에서 공개 설정하기', 'Choose to publish in Social'), t('프로필과 공개할 취향을 확인한 뒤 직접 공개해요.', 'Review your profile and taste, then choose to publish.')],
                [t('다른 취향에 코멘트 남기기', 'Join the conversation'), t('다른 사람의 공개 지도를 둘러보고 코멘트를 남겨요.', 'Explore someone’s public map and leave a comment.')],
            ],
            note: t('내 지도는 자동으로 공개되지 않아요. 소셜에서 직접 공개 여부를 바꿀 수 있어요.', 'Your map is not published automatically. You control whether it is public in Social.'),
        },
    ];
}

export function desktopGuideSteps(en) {
    const t = (ko, english) => en ? english : ko;
    return [
        { target: '.tm-canvas-wrap', icon: 'map', label: t('내 음악 보기', 'Your music'), title: t('먼저, 곡 하나를 눌러보세요', 'Start by selecting a song'), text: t('앨범 버블이나 별 하나가 내 음악 한 곡이에요. 누르면 곡 정보가 열려요.', 'Each album bubble or star is one of your songs. Select one to open its details.'), gesture: t('앨범 버블 또는 별 누르기', 'Select an album or a star'), hint: t('닮은 곡끼리 가까이 모여 있어요.', 'Similar songs are grouped close together.') },
        { target: '.ccp-card', openTrack: true, icon: 'play', label: t('곡 정보', 'Song details'), title: t('음악을 듣고, 연결을 따라가요', 'Listen, then follow a connection'), text: t('선택한 곡을 듣거나 ‘별자리 항해’로 이어지는 곡들을 둘러볼 수 있어요.', 'Listen to the selected song, or choose “Constellation voyage” to explore connected songs.'), gesture: t('곡 정보 → 별자리 항해', 'Song details → Constellation voyage'), hint: t('안내를 마친 뒤 원하는 곡으로 시작해 보세요.', 'After the tour, try it with a song of your choice.') },
        { target: '.tm-view-switcher', icon: 'compass', label: t('지도 보기', 'Map views'), title: t('같은 취향을, 다른 모습으로', 'See another side of your taste'), text: t('Taste Field에서는 앨범으로, Spectra에서는 별과 연결로 내 음악을 살펴봐요.', 'See your music as albums in Taste Field, or as stars and connections in Spectra.'), gesture: 'Taste Field ↔ Spectra', hint: t('보는 방식이 바뀌어도 내 음악은 그대로예요.', 'Both views show the same music collection.') },
        { target: '.tm-dock-actions .tm-dock-action:first-child', icon: 'discover', label: t('새 음악 찾기', 'New music'), title: t('마음에 들면, +로 담아보세요', 'Found a favorite? Select +'), text: t('‘새 음악 찾기’에서 추천 곡을 들어보세요. +를 누르면 내 지도에 함께 저장돼요.', 'Listen to recommendations in “New music.” Select + to add a favorite to your map.'), gesture: t('새 음악 찾기 → +', 'New music → +'), hint: t('추가한 곡은 닮은 곡 옆에 자리 잡아요.', 'Your new song settles beside similar songs.') },
        { target: '.tm-dock-actions .tm-dock-action:last-child', icon: 'heart', label: t('곡 모으기', 'Collect songs'), title: t('좋아하는 곡을 한데 모아요', 'Make a group of your favorites'), text: t('‘선택’을 켜고 곡들을 드래그해 골라보세요. 이름을 붙여 나만의 그룹으로 저장할 수 있어요.', 'Turn on “Select” and drag across songs. Give your selection a name to save it as a group.'), gesture: t('선택 → 드래그로 곡 고르기', 'Select → Drag across songs'), hint: t('분위기나 상황에 맞는 나만의 모음도 만들어보세요.', 'Try collecting songs for a mood or a moment.') },
        { target: '.tm-dock-zoom', icon: 'search', label: t('지도 이동', 'Move around'), title: t('가까이 보고, 전체로 돌아와요', 'Zoom in. Find your way back.'), text: t('−와 +로 지도를 확대·축소해요. 가운데 퍼센트를 누르면 전체 곡이 다시 보여요.', 'Use − and + to zoom. Select the percentage in the middle to bring all your songs back into view.'), gesture: t('가운데 퍼센트 → 전체 보기', 'Zoom percentage → See all'), hint: t('이 안내는 ‘사용 안내 · 문의’에서 언제든 다시 볼 수 있어요.', 'You can reopen this walkthrough anytime from Guide & feedback.') },
    ];
}
