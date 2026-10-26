# 한강 노을 배경 생성 기록

도구: 내장 `image_gen.imagegen` (CLI/API 키 사용 없음).
자산: `public/cockpit/ioniq6-hangang-sunset-v2.png`, 1672 × 941 PNG.
입력: 기존 벡터 운전자 시점 캡처(구도 유지 대상) + 현대자동차 공식 IONIQ 6 실내 사진(소재·형태 참고).
실제 주행 사진이나 정확한 지리 재현이 아닌 AI 생성 콘셉트다. 두 디스플레이와 음성 반응은 웹에서 별도 렌더링한다.

## 사용한 프롬프트

Use case: sketch-to-render. Asset type: full-screen 16:9 background plate for a working automotive web prototype.
Input image 1 is the EDIT TARGET and exact layout guide (the current vector cockpit), image 2 is a REFERENCE ONLY for realistic Hyundai IONIQ 6 interior material and form. Upgrade image 1 into a very high-fidelity, photoreal automotive interior visualization. Keep LEFT-HAND drive as in image 1. Do NOT mirror to the right-hand drive reference. Preserve image 1 composition/camera and display locations exactly, with a clean straight-on dual display plane for compositing functional HTML screens.

Scene: viewed from a driver's eye level with slight wide-angle 28mm lens inside a dark charcoal IONIQ 6-inspired original-generation cockpit. Beyond windshield, a beautiful credible Seoul Hangang riverside at sunset, seen from a riverside road: road leading into distance at left/center, broad Han River water clearly visible across right half, long bridge crossing in middle distance, recognizable Yeouido-style skyline far away, warm apricot sky fading into lavender blue, long natural warm reflections on rippled water. Calm premium Seoul commute atmosphere, not a futuristic fantasy city. Do not claim a precise geographic location.
Materials: realistic micrograin leather, stitched seams around a round two-spoke steering wheel, restrained satin aluminum, soft dark woven dashboard, glass surfaces with very subtle grazing reflections, fine air vent slats, original IONIQ 6 style four small pixel lights on steering hub. Soft warm sunset light rakes the top of dashboard and steering rim; cool subtle cyan trim along dash. Rich shadow detail, premium real car photography, physically plausible light, restrained contrast, no cheap glossy plastic.
Critical compositing invariants using normalized image coordinates: cluster screen x20.875%-50.875%, y33.11%-57.33%; infotainment screen x52.125%-88.0625%, y33.11%-57.33%. Both screen surfaces must be completely EMPTY uniform near-black #080f19, no UI, no text, no symbols, no instrument dials, no reflections obscuring screen, clean straight horizontal/vertical edges. One continuous slim dark metal glass frame surrounds both. Keep steering centered x29.6%, y83%, upper rim below the displays (no overlap over the screen areas). Keep center climate console lower center/right as in target, realistic but no legible labels. Wheel four pixel lights at x27.4%-31.8%, y84.2%.
Remove ALL existing labels, SPECTRA text, numbers, caption, corner badges, app UI, arrows and watermarks from the entire image. ONLY the realistic cockpit and outside scene should remain. No hands, no occupants, no phone, no pasted floating UI. The images will be overlaid with live screens in code. Landscape full-bleed 16:9, 2560x1440 or higher if possible.
