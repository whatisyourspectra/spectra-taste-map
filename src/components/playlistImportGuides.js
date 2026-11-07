export const IMPORT_GUIDE_STEPS = ['계정 확인', '목록 선택', '파일 저장', '지도 만들기'];

// Only content differs; every service is rendered by PlaylistImportGuide.
export const IMPORT_PLATFORMS = [
    {
        id: 'spotify', label: 'Spotify', format: 'CSV', exportPath: 'spotify-to-file', accent: '#80dca3',
        libraryUrl: 'https://open.spotify.com/',
        accountTitle: '평소 음악을 듣는 Spotify 계정으로 로그인하세요.',
        accountCheck: '평소 Spotify 보관함을 사용하는 계정으로 로그인하세요. 다른 계정에 연결되면 플레이리스트가 다르게 보일 수 있어요.',
        missingLibrary: [
            'Spotify 웹에서도 같은 계정의 보관함이 보이는지 확인하세요. 목록이 다르면 평소 사용하는 계정으로 다시 로그인하세요.',
            '웹에서는 목록이 보이는데 TuneMyMusic에서만 비어 있다면 Spotify를 다시 연결하고 보관함 접근 요청을 확인하세요.',
        ],
        missingPlaylist: [
            'Spotify 앱에서 가져올 목록이 내 보관함에 저장되어 있는지 확인한 뒤 TuneMyMusic에서 다시 불러오세요.',
            '계속 찾기 어렵다면 원하는 곡 몇 개로 새 플레이리스트를 만들고, 같은 계정의 웹 보관함에 나타나는지 확인하세요.',
        ],
        videoSteps: ['connect', 'connect', 'export', 'upload'],
    },
    {
        id: 'apple', label: 'Apple Music', format: 'CSV / TXT', exportPath: 'apple-music-to-file', accent: '#f696b0',
        libraryUrl: 'https://music.apple.com/',
        accountTitle: '음악을 듣는 Apple 계정으로 로그인하세요.',
        accountCheck: 'Apple Music 구독과 보관함을 사용하는 Apple 계정으로 로그인하세요. iCloud 계정과 다를 수 있어요.',
        missingLibrary: [
            'music.apple.com에서 같은 계정으로 로그인해 보관함이 보이는지 확인하세요. 목록이 다르면 평소 음악을 듣는 계정으로 다시 로그인하세요.',
            'Apple Music 구독 상태와 보관함 동기화 설정을 확인하세요. 동기화 중이라면 완료된 뒤 목록을 다시 불러오세요.',
            '보관함은 보이는데 TuneMyMusic 목록만 비어 있다면, Apple Music 연결을 다시 시도하고 보관함 접근 허용 여부를 확인하세요.',
        ],
        syncHelp: 'https://support.apple.com/118285',
        missingPlaylist: [
            'Apple Music 앱에서 해당 목록을 열고 보관함에 추가되어 있는지 확인하세요. 곡이 기기에만 저장되어 있다면 웹 보관함에서도 보이는지 확인해 주세요.',
            '계속 찾기 어렵다면 원하는 곡 몇 개로 새 플레이리스트를 만들고, 웹 보관함에 나타난 뒤 TuneMyMusic에서 다시 불러오세요. 공개 설정을 바꿀 필요는 없어요.',
        ],
        playlistHelp: 'https://support.apple.com/118289',
    },
    {
        id: 'youtube', label: 'YouTube Music', format: 'TXT', exportPath: 'youtube-music-to-file', accent: '#ff929b',
        libraryUrl: 'https://music.youtube.com/',
        accountTitle: '음악을 듣는 Google 계정으로 로그인하세요.',
        accountCheck: '평소 YouTube Music 보관함을 사용하는 Google 계정을 선택하세요. 여러 계정이 있다면 현재 선택한 계정을 먼저 확인하세요.',
        missingLibrary: [
            'YouTube Music 웹에서 같은 Google 계정으로 로그인해 보관함을 확인하세요. 목록이 다르면 평소 음악을 듣는 계정으로 바꾸세요.',
            '웹에서는 목록이 보이는데 TuneMyMusic에서만 비어 있다면 YouTube Music을 다시 연결하고 접근 허용 요청을 확인하세요.',
        ],
        missingPlaylist: [
            'YouTube Music에서 원하는 플레이리스트가 보관함에 저장되어 있는지 확인한 뒤 TuneMyMusic에서 다시 불러오세요.',
            '계속 찾기 어렵다면 원하는 곡 몇 개로 새 플레이리스트를 만들고, 같은 계정의 웹 보관함에 나타나는지 확인하세요.',
        ],
    },
];
