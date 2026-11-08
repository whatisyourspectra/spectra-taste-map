# SPECTRA mobile design

The mobile app retains its dark identity and uses shared foundations in `src/styles/mobileDesign.css`: charcoal surfaces, a SPECTRA lavender action color (#b9a3ff) with dark text on filled buttons, Pretendard-first text, consistent spacing and 14–24px corner radii. The map and constellation artwork retain their own expressive colors. The original desktop map styles are unchanged.

The system covers the mobile map shell, song sheets and search, discovery/loading/error states, Today and its record calendar, Social feed/profile/publication/comments, login/account, sharing and the mobile playlist-import form. Important actions have filled buttons; secondary actions use quiet surfaces or text. Long track titles reserve enough height to keep playback controls in place. Inputs use 16px text; navigation retains safe-area and software-keyboard handling.

Motion uses short press feedback and eased changes in position or opacity. Reduced-motion preferences disable transitions, animations and press scaling. Social moves help into its header, freeing the feed from a floating help button. Existing routing, storage, publication controls and discovery requests remain in place.

References: [Toss Design System Mobile](https://tossmini-docs.toss.im/tds-mobile/) and [Toss on consistent component patterns and accessibility](https://toss.tech/article/toss-design-system). These are design references; no Toss SDK or proprietary font is installed.

Validation uses local fixtures, without production accounts: the mobile polish and personal-map browser flows cover 320, 390 and 430px widths, long titles, addition/persistence, navigation, large safe areas, short keyboard viewports and reduced motion. Social coverage includes publication, comments, retry, guest access and mobile navigation. Review images are generated under `output/review/` and are not production user data.

The resting map shelf is a single compact row (96px before navigation clearance), leaving more room for the canvas. Mobile navigation labels are defined once in `src/components/mobileMusicTabs.js` and shared across map and Social: 내 지도 / 발견 / 오늘 / 소셜, or My map / Discover / Today / Social.
