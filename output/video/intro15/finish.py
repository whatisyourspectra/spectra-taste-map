"""Encode delivery copies and verify the completed SPECTRA master."""
import json
from pathlib import Path
import re
import subprocess

from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg
from normalize_metadata import normalize

HERE = Path(__file__).resolve().parent
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
MASTER = HERE / 'spectra-intro-15s-4k.mp4'
DELIVERY = HERE / 'spectra-intro-15s-1080p.mp4'

def run(args):
    result = subprocess.run([FFMPEG, '-hide_banner', '-y', *map(str, args)], capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(result.stderr[-8000:])
    return result

result = run(['-i', MASTER, '-vf', 'scale=1920:1080:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', DELIVERY])
(HERE / 'delivery-encode.log').write_text(result.stderr)
normalize(MASTER)
normalize(DELIVERY)
print('1080p delivery complete', flush=True)

result = run(['-i', MASTER, '-map', '0:v:0', '-map', '0:a:0', '-vf', 'blackdetect=d=0.15:pix_th=0.02', '-af', 'volumedetect', '-f', 'null', '-'])
(HERE / 'validation.log').write_text(result.stderr)
frame_count = re.findall(r'frame=\s*(\d+)', result.stderr)
if not frame_count or int(frame_count[-1]) != 450:
    raise RuntimeError('Unexpected frame count')
if 'black_start:' in result.stderr:
    raise RuntimeError('Unexpected black interval detected')
print('Decoded all 450 master frames and audio; no black intervals', flush=True)

poster = HERE / 'spectra-intro-poster.jpg'
run(['-ss', '13.5', '-i', MASTER, '-frames:v', '1', '-vf', 'scale=1920:1080:flags=lanczos', '-q:v', '2', poster])

times = [1.8, 5.4, 9.0, 10.6, 12.8, 14.5]
labels = ['YOUR TASTE. IN SPECTRA.', 'FROM MUSIC TO MAP', 'CONNECT YOUR TASTE', 'EXPAND YOUR DISCOVERY', 'SPECTRA', 'YOUR MUSIC TASTE MAP']
board = Image.new('RGB', (1920, 816), '#080B14')
draw = ImageDraw.Draw(board)
font = ImageFont.truetype(str(HERE / 'assets' / 'Syne-SemiBold.ttf'), 20)
for i, (time, label) in enumerate(zip(times, labels)):
    frame = HERE / 'frames' / f'final-{time:.1f}.jpg'
    run(['-ss', time, '-i', MASTER, '-frames:v', '1', '-vf', 'scale=640:360:flags=lanczos', '-q:v', '2', frame])
    image = Image.open(frame).convert('RGB')
    x = (i % 3) * 640
    y = (i // 3) * 408
    draw.text((x + 22, y + 12), f'{time:04.1f}s  /  {label}', font=font, fill='#A9BDD9')
    board.paste(image, (x, y + 48))
board.save(HERE / 'spectra-intro-storyboard.jpg', quality=95)

notes = {
    'title': 'SPECTRA — Your taste. In spectra.',
    'duration_seconds': 15,
    'master': {'file': MASTER.name, 'width': 3840, 'height': 2160, 'fps': 30, 'frames': 450, 'codec': 'H.264 High / yuv420p', 'quality': 'CRF 17', 'native_render': True},
    'delivery': {'file': DELIVERY.name, 'width': 1920, 'height': 1080, 'fps': 30, 'codec': 'H.264 / yuv420p', 'quality': 'CRF 18'},
    'audio': {'file': 'score.wav', 'original_procedural_synthesis': True, 'delivery_codec': 'AAC 320 kbps stereo 48 kHz'},
    'chapters': [
        {'time': '0.00–3.35', 'visual': 'Native landing wire sculpture macro, camera pullback, oversized Syne typography', 'copy': 'Your taste. In spectra.'},
        {'time': '3.35–7.60', 'visual': '18 album bubbles assemble into three color-coded regions', 'copy': '좋아하는 음악이 나만의 지도가 됩니다.'},
        {'time': '7.60–11.80', 'visual': 'Album field collapses into connected constellation; signals discover a new branch', 'copy': '취향을 잇고, 발견을 넓혀요.'},
        {'time': '11.80–15.00', 'visual': 'Large actual gradient wordmark with lingering sculpture', 'copy': '음악으로 발견하는 나의 스펙트라 / spectra-music.org'}
    ],
    'assets': ['src/pages/LaunchTasteMapHero.jsx (sculpture equation)', 'public/spectra-wordmark.svg', 'public/demo-covers/*.jpg', 'Syne 600/800 from Google Fonts', 'Apple SD Gothic Neo (local system font)'],
    'validation': {'decoded_frames': 450, 'unexpected_black_intervals': False, 'log': 'validation.log'},
    'application_files_changed': False,
}
(HERE / 'production-notes.json').write_text(json.dumps(notes, ensure_ascii=False, indent=2))
print(json.dumps({'master_mb': round(MASTER.stat().st_size / 1e6, 2), 'delivery_mb': round(DELIVERY.stat().st_size / 1e6, 2), 'frames': 450, 'seconds': 15}, indent=2))
