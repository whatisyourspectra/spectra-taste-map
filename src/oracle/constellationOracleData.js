import { hash01 } from '../taste/constellationTopology.js';

export function localDay(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function formatKoreanDate(date = new Date()) {
    const daysKo = ['일', '월', '화', '수', '목', '금', '토'];
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dow = daysKo[date.getDay()];
    return `${date.getFullYear()}.${month}.${day} ${dow}요일`;
}

export function formatEnglishDate(date = new Date()) {
    const daysEn = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const monthsEn = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `${monthsEn[date.getMonth()]} ${date.getDate()} · ${daysEn[date.getDay()]}`;
}

// Lunar phase approximate calculation for cosmic aesthetic
export function getMoonPhase(date = new Date()) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const c = Math.floor(year / 100);
    const epact = (11 * (year % 19) + 20 + Math.floor((c - 19) / 4) - c + Math.floor(26 * (month + 1) / 10) + day) % 30;
    
    if (epact < 2 || epact > 28) return { name: '신월 (New Moon)', symbol: '🌑' };
    if (epact < 7) return { name: '초승달 (Waxing Crescent)', symbol: '🌒' };
    if (epact < 9) return { name: '상현달 (First Quarter)', symbol: '🌓' };
    if (epact < 14) return { name: '차오르는 달 (Waxing Gibbous)', symbol: '🌔' };
    if (epact < 17) return { name: '보름달 (Full Moon)', symbol: '🌕' };
    if (epact < 22) return { name: '기우는 달 (Waning Gibbous)', symbol: '🌖' };
    if (epact < 24) return { name: '하현달 (Last Quarter)', symbol: '🌗' };
    return { name: '그믐달 (Waning Crescent)', symbol: '🌘' };
}

// Curated contextual moments tailored by time of day
export function getContextMoments(date = new Date()) {
    const hour = date.getHours();

    if (hour >= 5 && hour < 12) {
        // Morning
        return [
            { id: 'ctx_dawn', label: '오늘은 조용히 시작하고 싶어요', labelEn: 'I want a quiet start today', emoji: '☕️', archetypeKey: 'clarity' },
            { id: 'ctx_commute', label: '출근길인데 벌써 하루가 길게 느껴져요', labelEn: 'The day already feels long on my commute', emoji: '🚶', archetypeKey: 'focus' },
            { id: 'ctx_awake', label: '눈은 떴는데 마음은 아직 침대에 있어요', labelEn: 'I am awake, but my mind is still in bed', emoji: '🌫️', archetypeKey: 'solace' },
        ];
    } else if (hour >= 12 && hour < 18) {
        // Afternoon
        return [
            { id: 'ctx_burnout', label: '일하다가 갑자기 집중이 끊겼어요', labelEn: 'I suddenly lost focus at work', emoji: '☕️', archetypeKey: 'burnout' },
            { id: 'ctx_escape', label: '잠깐이라도 어디론가 떠나고 싶어요', labelEn: 'I want to get away, even for a moment', emoji: '💨', archetypeKey: 'wanderlust' },
            { id: 'ctx_pause', label: '사람들 속에서 혼자 숨 고르고 싶어요', labelEn: 'I need a breath of my own in the crowd', emoji: '🌿', archetypeKey: 'stillness' },
        ];
    } else {
        // Night & Midnight
        return [
            { id: 'ctx_bed', label: '잠들기 전, 낮에 한 말이 자꾸 떠올라요', labelEn: 'I keep replaying something I said today', emoji: '🛌', archetypeKey: 'regret' },
            { id: 'ctx_nightwalk', label: '퇴근했는데 머리가 아직 바빠요', labelEn: 'I am home, but my mind is still at work', emoji: '🌧️', archetypeKey: 'solitude' },
            { id: 'ctx_deepwork', label: '모두 잠든 뒤에야 내 시간이 와요', labelEn: 'My own time begins after everyone sleeps', emoji: '🌌', archetypeKey: 'flow' },
        ];
    }
}

// Saju / Tarot Archetype Mirror data
export const ARCHETYPE_MIRRORS = {
    custom: {
        tarot: 'Your moment',
        element: '오늘의 선택',
        korean: '지금의 마음에 맞는 방향을 골라보세요.',
        english: 'Choose the direction that feels right for this moment.',
        shifts: [
            {
                id: 'shift_custom_calm',
                name: '조금 천천히 가기',
                nameEn: 'Slow down a little',
                desc: '마음의 속도를 낮추는 음악을 들어요',
                descEn: 'Listen to music that slows your pace',
                color: '#8db9f4',
                constellation: 'anchor',
                targetEnergy: 0.28,
                camera: { yaw: 0.08, pitch: -0.06, zoom: 1.35 },
            },
            {
                id: 'shift_custom_move',
                name: '한 걸음 움직이기',
                nameEn: 'Take one step',
                desc: '지금의 공기를 바꿀 리듬을 들어요',
                descEn: 'Listen to a rhythm that changes the air',
                color: '#b49af5',
                constellation: 'arrow',
                targetEnergy: 0.72,
                camera: { yaw: 0.62, pitch: 0.12, zoom: 1.35 },
            },
        ],
    },
    burnout: {
        tarot: 'The Star (별자리)',
        element: '화(火)의 피로',
        korean: '지금 당신의 스펙트라는 "완벽주의의 불(火)"에 지쳐 있네요. 타로의 The Star처럼, 지금 필요한 건 스스로를 채찍질하는 게 아니라 고요한 숨고르기입니다.',
        english: 'Your Spectra is weary from the flame of perfectionism. Like The Star in tarot, what you need right now is not self-discipline, but gentle stillness.',
        shifts: [
            {
                id: 'shift_calm',
                name: '차분하게 가라앉히기',
                nameEn: 'Drift into Deep Calm',
                element: '수(水)의 위로',
                emoji: '🌊',
                desc: '불필요한 열기를 식히고 고요한 심해로 가라앉아 쉬기',
                color: '#60a5fa',
                constellation: 'anchor',
                targetEnergy: 0.25,
                camera: { yaw: 0.08, pitch: -0.06, zoom: 1.35 },
            },
            {
                id: 'shift_vital',
                name: '반전의 텐션 끌어올리기',
                nameEn: 'Ignite Fresh Energy',
                element: '목(木)의 도약',
                emoji: '⚡️',
                desc: '오히려 경쾌한 비트로 번아웃을 뚫고 텐션 환기하기',
                color: '#f59e0b',
                constellation: 'arrow',
                targetEnergy: 0.78,
                camera: { yaw: 0.72, pitch: 0.16, zoom: 1.4 },
            },
        ],
    },
    wanderlust: {
        tarot: 'The Fool (순례자)',
        element: '풍(風)의 방황',
        korean: '답답한 공간을 뚫고 날아가고 싶은 바람의 기운이 가득해요. 정해진 목적지가 없어도 좋아요. 낯선 선율이 당신의 새로운 나침반이 되어줄 거예요.',
        english: 'A restless wind urges you beyond familiar walls. You do not need a map; an unfamiliar melody will become your compass.',
        shifts: [
            {
                id: 'shift_explore',
                name: '경계 너머로 모험하기',
                nameEn: 'Venture Beyond Horizons',
                element: '풍(風)의 비상',
                emoji: '🧭',
                desc: '새롭고 낯선 사운드로 호기심의 날개 펼치기',
                color: '#a78bfa',
                constellation: 'compass',
                targetEnergy: 0.65,
                camera: { yaw: -0.76, pitch: -0.16, zoom: 1.38 },
            },
            {
                id: 'shift_ground',
                name: '지금 여기에 안착하기',
                nameEn: 'Anchor in the Present',
                element: '토(土)의 안정',
                emoji: '🪐',
                desc: '들뜬 마음을 포근하고 묵직한 베이스로 감싸기',
                color: '#34d399',
                constellation: 'lantern',
                targetEnergy: 0.38,
                camera: { yaw: 0.05, pitch: 0.1, zoom: 1.32 },
            },
        ],
    },
    regret: {
        tarot: 'The Moon (달과 심연)',
        element: '수(水)의 침잠',
        korean: '오늘 하루 마음에 걸렸던 말들과 무거웠던 생각들이 귓가를 맴도네요. 밤의 요람이 당신의 모든 무게를 가만히 안아줄 준비가 되어 있습니다.',
        english: 'Unspoken words and lingering regrets circle quietly. The cosmic cradle is ready to gently embrace your weary heart.',
        shifts: [
            {
                id: 'shift_release',
                name: '모든 생각 털어내고 잠들기',
                nameEn: 'Release into Silence',
                element: '수(水)의 정화',
                emoji: '🌙',
                desc: '생각의 스위치를 끄고 부드러운 자장가에 안기기',
                color: '#818cf8',
                constellation: 'chalice',
                targetEnergy: 0.2,
                camera: { yaw: 0, pitch: 0, zoom: 0.95 },
            },
            {
                id: 'shift_warmth',
                name: '마음의 온기 회복하기',
                nameEn: 'Kindle Inner Warmth',
                element: '화(火)의 치유',
                emoji: '🕯️',
                desc: '따뜻한 어쿠스틱 온기로 얼어붙은 감정 녹이기',
                color: '#fb923c',
                constellation: 'lantern',
                targetEnergy: 0.45,
                camera: { yaw: 0.65, pitch: 0.12, zoom: 1.3 },
            },
        ],
    },
    solitude: {
        tarot: 'The Hermit (은둔자)',
        element: '금(金)의 예리함',
        korean: '세상의 시선과 소음에서 벗어나, 빗소리처럼 담담한 혼자만의 성벽 속으로 들어섰군요. 이 고요는 외로움이 아니라 온전한 나를 만나는 성역입니다.',
        english: 'Stepping away from the noisy world, entering the sanctuary of your own silence. This stillness is not loneliness, but pure intimacy with self.',
        shifts: [
            {
                id: 'shift_dive',
                name: '깊은 사색 속으로 침잠',
                nameEn: 'Submerge in Thought',
                element: '수(水)의 심연',
                emoji: '🌊',
                desc: '미니멀한 선율로 내면의 공간을 더 넓히기',
                color: '#38bdf8',
                constellation: 'anchor',
                targetEnergy: 0.28,
                camera: { yaw: -0.68, pitch: -0.12, zoom: 1.34 },
            },
            {
                id: 'shift_glow',
                name: '작은 등불 하나 켜두기',
                nameEn: 'Kindle a Gentle Beacon',
                element: '토(土)의 위안',
                emoji: '🕯️',
                desc: '외롭지 않도록 따스한 멜로디의 촛불 켜기',
                color: '#f472b6',
                constellation: 'lantern',
                targetEnergy: 0.5,
                camera: { yaw: 0.08, pitch: -0.06, zoom: 1.35 },
            },
        ],
    },
    flow: {
        tarot: 'The Magician (창조자)',
        element: '목(木)의 개화',
        korean: '방해하는 이 없는 밤, 당신의 의식 속에서 새로운 상상과 영감이 싹트고 있습니다. 밤하늘의 주파수가 당신의 감각을 예리하게 벼려줍니다.',
        english: 'In the uninterrupted night, fresh imagination sprouts. The nocturnal frequencies are tuning your creative senses to perfection.',
        shifts: [
            {
                id: 'shift_deepflow',
                name: '무한한 몰입으로 파고들기',
                nameEn: 'Deepen the Creative Flow',
                element: '풍(風)의 리듬',
                emoji: '🎧',
                desc: '끊기지 않는 그루브로 영감의 흐름 타기',
                color: '#c084fc',
                constellation: 'telescope',
                targetEnergy: 0.58,
                camera: { yaw: 0.72, pitch: 0.16, zoom: 1.38 },
            },
            {
                id: 'shift_spark',
                name: '짜릿한 불꽃 튀기기',
                nameEn: 'Ignite Electric Spark',
                element: '화(火)의 폭발',
                emoji: '⚡️',
                desc: '한계를 뚫어줄 강렬한 신스 비트 충전',
                color: '#fb7185',
                constellation: 'arrow',
                targetEnergy: 0.82,
                camera: { yaw: -0.74, pitch: -0.16, zoom: 1.42 },
            },
        ],
    },
    clarity: {
        tarot: 'The Sun (아침의 여명)',
        element: '목(木)의 생동',
        korean: '새로운 하루의 지평선이 열리고 있습니다. 어제의 찌꺼기를 깨끗이 비워내고, 맑고 투명한 아침 햇살처럼 첫 호흡을 가다듬을 시간입니다.',
        english: 'A new horizon awakens. Clear away the dust of yesterday and welcome the pure, translucent dawn with your first deep breath.',
        shifts: [
            {
                id: 'shift_gentle',
                name: '부드럽게 잠 깨우기',
                nameEn: 'Awaken with Soft Light',
                element: '수(水)의 청명',
                emoji: '🌱',
                desc: '포근한 어쿠스틱 선율로 서서히 기지개 켜기',
                color: '#4ade80',
                constellation: 'chalice',
                targetEnergy: 0.35,
                camera: { yaw: 0.08, pitch: -0.06, zoom: 1.3 },
            },
            {
                id: 'shift_stride',
                name: '활기차게 발걸음 떼기',
                nameEn: 'Step into Momentum',
                element: '금(金)의 전진',
                emoji: '☀️',
                desc: '산뜻하고 당당한 리듬으로 기분 끌어올리기',
                color: '#facc15',
                constellation: 'arrow',
                targetEnergy: 0.7,
                camera: { yaw: 0.68, pitch: 0.14, zoom: 1.35 },
            },
        ],
    },
};

// Constellation Oracle Symbols and their geometric nodes
export const ORACLE_CONSTELLATIONS = {
    anchor: {
        id: 'anchor',
        name: '침묵의 닻자리',
        nameEn: 'The Anchor',
        symbol: '⚓️',
        essence: '고요한 침잠 · 심해의 평온',
        essenceEn: 'Deep Solitude & Peaceful Anchoring',
        poem: '세상의 거친 물결을 지나, 마음에 단단한 닻을 내리는 시간.',
        poemEn: 'Beyond turbulent waves, lowering a solid anchor into your stillness.',
        nodes: [
            { x: 180, y: 80, radius: 4 },
            { x: 180, y: 140, radius: 3 },
            { x: 140, y: 140, radius: 2.5 },
            { x: 220, y: 140, radius: 2.5 },
            { x: 180, y: 220, radius: 4.5 },
            { x: 120, y: 200, radius: 3 },
            { x: 240, y: 200, radius: 3 },
        ],
        edges: [
            [0, 1], [2, 3], [1, 4], [4, 5], [4, 6],
        ],
    },
    arrow: {
        id: 'arrow',
        name: '새벽의 화살자리',
        nameEn: 'The Arrow',
        symbol: '🏹',
        essence: '결단의 도약 · 번아웃 극복',
        essenceEn: 'Courageous Thrust & Breaking Stagnation',
        poem: '망설임의 안개를 꿰뚫고, 다시 힘차게 쏘아 올린 용기의 궤적.',
        poemEn: 'Piercing through lingering hesitation, a fearless trajectory of will.',
        nodes: [
            { x: 100, y: 240, radius: 3 },
            { x: 150, y: 190, radius: 2.5 },
            { x: 200, y: 140, radius: 3 },
            { x: 250, y: 90, radius: 4.5 },
            { x: 210, y: 90, radius: 2.5 },
            { x: 250, y: 130, radius: 2.5 },
        ],
        edges: [
            [0, 1], [1, 2], [2, 3], [3, 4], [3, 5],
        ],
    },
    compass: {
        id: 'compass',
        name: '은빛 나침반자리',
        nameEn: 'The Compass',
        symbol: '🧭',
        essence: '방향의 발견 · 미지의 탐색',
        essenceEn: 'True North & Boundless Curiosity',
        poem: '어디로 가야 할지 모를 때, 내 안의 가장 진실한 북극성을 바라보며.',
        poemEn: 'When paths blur, trusting the quiet North Star burning inside.',
        nodes: [
            { x: 180, y: 70, radius: 4.5 },
            { x: 250, y: 160, radius: 3 },
            { x: 180, y: 250, radius: 3 },
            { x: 110, y: 160, radius: 3 },
            { x: 180, y: 160, radius: 4 },
        ],
        edges: [
            [0, 4], [1, 4], [2, 4], [3, 4], [0, 1], [1, 2], [2, 3], [3, 0],
        ],
    },
    lantern: {
        id: 'lantern',
        name: '숲의 등대자리',
        nameEn: 'The Lantern',
        symbol: '🕯️',
        essence: '따뜻한 온기 · 외로움의 치유',
        essenceEn: 'Gentle Hearth & Cozy Solace',
        poem: '가장 짙은 어둠 속에서도 나를 묵묵히 지켜주는 작은 촛불의 온기.',
        poemEn: 'A steady beacon glowing through the dark, warming frozen thoughts.',
        nodes: [
            { x: 180, y: 90, radius: 4.5 },
            { x: 150, y: 130, radius: 2.5 },
            { x: 210, y: 130, radius: 2.5 },
            { x: 150, y: 210, radius: 3 },
            { x: 210, y: 210, radius: 3 },
            { x: 180, y: 250, radius: 3.5 },
        ],
        edges: [
            [0, 1], [0, 2], [1, 2], [1, 3], [2, 4], [3, 4], [3, 5], [4, 5],
        ],
    },
    chalice: {
        id: 'chalice',
        name: '푸른 성배자리',
        nameEn: 'The Chalice',
        symbol: '🍷',
        essence: '감성의 정화 · 온전한 위로',
        essenceEn: 'Nourishing Springs & Deep Healing',
        poem: '메말랐던 감정의 잔에 맑고 부드러운 눈물의 온기를 채우는 밤.',
        poemEn: 'Filling a parched cup with pure, tender drops of starlight.',
        nodes: [
            { x: 130, y: 100, radius: 3 },
            { x: 230, y: 100, radius: 3 },
            { x: 145, y: 160, radius: 2.5 },
            { x: 215, y: 160, radius: 2.5 },
            { x: 180, y: 190, radius: 4 },
            { x: 180, y: 240, radius: 3 },
            { x: 140, y: 260, radius: 3 },
            { x: 220, y: 260, radius: 3 },
        ],
        edges: [
            [0, 1], [0, 2], [1, 3], [2, 4], [3, 4], [4, 5], [5, 6], [5, 7], [6, 7],
        ],
    },
    telescope: {
        id: 'telescope',
        name: '밤의 망원경자리',
        nameEn: 'The Telescope',
        symbol: '🔭',
        essence: '넓은 시야 · 영감의 확장',
        essenceEn: 'Expansive Horizons & Celestial Perspective',
        poem: '눈앞의 작은 고민에서 물러나, 광활한 밤하늘 전체를 조망할 때.',
        poemEn: 'Gazing beyond narrow worries, witnessing the vast cosmic tapestry.',
        nodes: [
            { x: 100, y: 240, radius: 3 },
            { x: 140, y: 200, radius: 3 },
            { x: 200, y: 140, radius: 3.5 },
            { x: 260, y: 80, radius: 4.5 },
            { x: 240, y: 100, radius: 2.5 },
            { x: 180, y: 250, radius: 2.5 },
        ],
        edges: [
            [0, 1], [1, 2], [2, 3], [3, 4], [1, 5],
        ],
    },
};

// Explicit listening directions provide defaults; listeners can tune either axis.
const SHIFT_TONES = {
    shift_custom_calm: 0.4, shift_custom_move: 0.7, shift_calm: 0.35, shift_vital: 0.8,
    shift_explore: 0.6, shift_ground: 0.5, shift_release: 0.25, shift_warmth: 0.65,
    shift_dive: 0.3, shift_glow: 0.6, shift_deepflow: 0.45, shift_spark: 0.7,
    shift_gentle: 0.55, shift_stride: 0.8,
};

export function getMoodMirror(context) {
    const aliases = { focus: 'flow', solace: 'clarity', stillness: 'solitude' };
    const key = context?.archetypeKey;
    return ARCHETYPE_MIRRORS[aliases[key] || key] || ARCHETYPE_MIRRORS.custom;
}

export function moodDirection(shift) {
    return { ...shift, targetValence: shift.targetValence ?? SHIFT_TONES[shift.id] ?? 0.5 };
}

// Rank available tracks by the listener's two chosen dimensions. Unknown values
// contribute uncertainty, never fabricated audio features or match percentages.
export function rankMoodTracks(library = [], shift, day = localDay()) {
    const energy = shift?.targetEnergy ?? 0.5;
    const valence = shift?.targetValence ?? 0.5;
    const distance = (track) => {
        const dimensions = [['energy', energy, 0.6], ['valence', valence, 0.4]];
        let score = 0;
        let weight = 0;
        for (const [key, target, importance] of dimensions) {
            if (!Number.isFinite(track[key])) continue;
            score += Math.abs(track[key] - target) * importance;
            weight += importance;
        }
        // Unknown features are not treated as measured mood matches.
        return (weight ? score / weight : 0.5) + (1 - weight) * 0.08;
    };
    return [...new Map((library || []).filter(track => track?.id).map(track => [track.id, track])).values()]
        .sort((a, b) => distance(a) - distance(b)
            || hash01(`${day}:${shift?.id}:${a.id}`) - hash01(`${day}:${shift?.id}:${b.id}`));
}

export function moodTrackDescription(track, en = false) {
    const labels = [];
    if (Number.isFinite(track?.energy)) labels.push(track.energy < 0.4
        ? (en ? 'Quiet energy' : '차분한 에너지') : track.energy > 0.65
            ? (en ? 'Lively energy' : '활기찬 에너지') : (en ? 'Steady energy' : '편안한 에너지'));
    if (Number.isFinite(track?.valence)) labels.push(track.valence < 0.4
        ? (en ? 'Reflective tone' : '사색적인 톤') : track.valence > 0.65
            ? (en ? 'Bright tone' : '밝은 톤') : (en ? 'Balanced tone' : '담담한 톤'));
    return labels.join(' · ') || (en ? 'Listen and decide how it feels' : '직접 듣고 느낌을 골라보세요');
}

export function prescribeTrack(library = [], shift, day = localDay()) {
    return rankMoodTracks(library, shift, day)[0] || null;
}

// Local storage keys and persistence helpers for Oracle Logs
const ORACLE_STORAGE_PREFIX = 'spectra_oracle_log_';

export function loadOracleRecords(identity) {
    if (!identity || typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(`${ORACLE_STORAGE_PREFIX}${identity}`);
        const records = raw ? JSON.parse(raw) : [];
        return Array.isArray(records) ? records.filter(record => record && typeof record.day === 'string') : [];
    } catch {
        return [];
    }
}

export function saveOracleRecord(identity, record) {
    if (!identity || !record || typeof window === 'undefined') return null;
    try {
        const existing = loadOracleRecords(identity);
        // Replace today's record if already exists, or prepend
        const filtered = existing.filter((r) => r.day !== record.day);
        const updated = [record, ...filtered].slice(0, 60); // keep up to 60 days
        localStorage.setItem(`${ORACLE_STORAGE_PREFIX}${identity}`, JSON.stringify(updated));
        return updated;
    } catch {
        return null;
    }
}
