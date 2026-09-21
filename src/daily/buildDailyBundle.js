import { uniqueTracks, getTasteGenres } from '../taste/buildTasteState.js';
import { hash01 } from '../taste/constellationTopology.js';

export function localDay(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export const DAILY_THEMES = [
    {
        name: ['느린 궤도', 'Slow orbit'],
        message: ['서두르지 않아도 괜찮아요. 오늘은 작은 소리에 조금 더 오래 머물러보세요.', 'Take your time today. Stay a little longer with the quieter sounds.'],
        energy: .25,
        color: '#a9bff1',
        tags: [['#차분한호흡', '#잔잔한음색', '#내면의시간'], ['#SlowTempo', '#Ambient', '#Mindfulness']],
    },
    {
        name: ['새로운 인력', 'A new gravity'],
        message: ['익숙한 취향 곁에서 낯선 빛이 반짝여요. 오늘은 한 걸음, 다른 방향으로.', 'A new light glows beside the familiar. Take one step in another direction.'],
        energy: .6,
        color: '#c2aff1',
        tags: [['#새로운발견', '#신선한이끌림', '#경계너머'], ['#Discovery', '#Curiosity', '#NewVibes']],
    },
    {
        name: ['빛이 드는 틈', 'A little daylight'],
        message: ['작은 리듬 하나가 하루의 표정을 바꿀지도 몰라요. 마음이 움직이는 쪽으로 가보세요.', 'A small rhythm may change the shape of your day. Follow what moves you.'],
        energy: .8,
        color: '#edc58d',
        tags: [['#경쾌한비트', '#하루의활력', '#산뜻한기분'], ['#Upbeat', '#Daylight', '#EnergyBoost']],
    },
    {
        name: ['푸른 여운', 'Blue afterglow'],
        message: ['오늘은 지나친 음악에도 다시 귀 기울여보세요. 익숙한 멜로디에 새로운 여운이 남을 거예요.', 'Return to a song you once passed by. Let a familiar melody leave a new afterglow.'],
        energy: .4,
        color: '#9fcfcf',
        tags: [['#서정적멜로디', '#기억의잔향', '#깊은여운'], ['#Melodic', '#Nostalgia', '#Afterglow']],
    },
    {
        name: ['자정의 성운', 'Midnight nebula'],
        message: ['밤이 깊어질수록 선명해지는 소리들. 몽환적인 신스와 감각적인 울림에 몸을 맡겨보세요.', 'Sounds that sharpen as night falls. Let dreamlike synths and nocturnal rhythms guide you.'],
        energy: .65,
        color: '#f472b6',
        tags: [['#신스웨이브', '#몽환적인밤', '#감각적울림'], ['#Synthwave', '#Dreamy', '#MidnightVibes']],
    },
    {
        name: ['새벽의 잔향', 'Dawn resonance'],
        message: ['아침 공기처럼 맑고 고요한 음의 결. 포근한 어쿠스틱 소리가 마음을 정돈해 줘요.', 'Pure and calm acoustic textures, like early morning air, gently organizing your thoughts.'],
        energy: .32,
        color: '#86efac',
        tags: [['#어쿠스틱', '#새벽공기', '#맑은울림'], ['#Acoustic', '#DawnAir', '#Clarity']],
    },
    {
        name: ['심해의 울림', 'Deep resonance'],
        message: ['바다 깊은 곳을 유영하듯, 묵직하고 따뜻한 그루브가 하루를 든든하게 받쳐줍니다.', 'Like drifting in the deep blue, warm and resonant basslines grounding your entire day.'],
        energy: .5,
        color: '#38bdf8',
        tags: [['#딥그루브', '#베이스라인', '#몰입의순간'], ['#DeepGroove', '#BassResonance', '#Immersion']],
    },
];
export function dailyTheme(day, identity) {
    return DAILY_THEMES[Math.floor(hash01(`${identity}:${day}:theme`) * DAILY_THEMES.length)];
}
export function buildDailyBundle(library, discoveries, day, identity, theme) {
    const known = new Set(library.map(t => t.id));
    const rank = (tracks) => uniqueTracks(tracks).sort((a, b) => {
        const score = t => Math.abs((Number.isFinite(t.energy) ? t.energy : .5) - theme.energy) * .6 + hash01(`${day}:${identity}:${t.id}`) * .4;
        return score(a) - score(b) || String(a.id).localeCompare(String(b.id));
    });
    const fresh = rank(discoveries.filter(t => !known.has(t.id))).slice(0, 3);
    return uniqueTracks([...fresh, ...rank(library)]).slice(0, 5).map(track => ({
        ...track, dailyOrigin: known.has(track.id) ? 'library' : 'discovery', dailyGenre: getTasteGenres(track)[0] || '',
    }));
}
