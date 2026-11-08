// The map and Social share destinations and translated tab labels.
export function mobileMusicTabs(lang) {
    const en = lang === 'en';
    return [
        { id: 'map', href: '/taste-map', icon: 'map', label: en ? 'My map' : '내 지도' },
        { id: 'discover', href: '/taste-map?tab=discover', icon: 'compass', label: en ? 'Discover' : '발견' },
        { id: 'today', href: '/taste-map?tab=today', icon: 'today', label: en ? 'Today' : '오늘' },
        { id: 'social', href: '/social', icon: 'social', label: en ? 'Social' : '소셜' },
    ];
}
