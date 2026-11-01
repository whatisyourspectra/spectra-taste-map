"""Validate the presentation film and create its poster and storyboard."""
import json
import re
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg

HERE = Path(__file__).resolve().parent
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
VIDEO = HERE / 'spectra-drive-intro-30s-1080p.mp4'

def run(*args):
    result = subprocess.run([FFMPEG, '-hide_banner', '-y', *map(str, args)], capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(result.stderr[-5000:])
    return result.stderr

log = run('-i', VIDEO, '-map', '0:v:0', '-map', '0:a:0', '-vf', 'blackdetect=d=0.15:pix_th=0.02', '-af', 'volumedetect', '-f', 'null', '-')
(HERE / 'validation.log').write_text(log)
counts = re.findall(r'frame=\s*(\d+)', log)
assert counts and int(counts[-1]) == 900, 'Expected 900 decoded frames'
assert '1920x1080' in log and '30 fps' in log
assert '48000 Hz, stereo' in log
assert 'black_start:' not in log, 'Unexpected black interval'
peak = float(re.search(r'max_volume: ([\-\d.]+) dB', log).group(1))
assert peak < 0, f'Audio needs more headroom: {peak} dBFS'
dur = re.search(r'Duration: (\d+):(\d+):([\d.]+)', log)
seconds = int(dur.group(1))*3600 + int(dur.group(2))*60 + float(dur.group(3))
assert abs(seconds-30) < .1

times = [2.5, 8.9, 13.0, 19.5, 24.8, 28.5]
labels = ['YOUR TASTE. YOUR NEXT TRACK.', 'SAY THE MOOD', 'KEEP YOUR TASTE', 'SHIFT THE MOOD', 'ON THE DISPLAY', 'SPECTRA DRIVE']
board = Image.new('RGB', (1920, 816), '#080d17')
draw = ImageDraw.Draw(board)
font = ImageFont.truetype(str(HERE.parent / 'intro15/assets/Syne-SemiBold.ttf'), 18)
for index, (time, label) in enumerate(zip(times, labels)):
    frame = HERE / 'previews' / f'final-{time:.1f}.jpg'
    run('-ss', time, '-i', VIDEO, '-frames:v', 1, '-vf', 'scale=640:360:flags=lanczos', '-q:v', 2, frame)
    x, y = index % 3 * 640, index // 3 * 408
    draw.text((x+20, y+14), f'{time:04.1f}s / {label}', font=font, fill='#a9bfd6')
    board.paste(Image.open(frame).convert('RGB'), (x, y+48))
board.save(HERE / 'spectra-drive-storyboard.jpg', quality=95)
run('-ss', 2.6, '-i', VIDEO, '-frames:v', 1, '-q:v', 2, HERE / 'spectra-drive-poster.jpg')
notes = json.loads((HERE / 'production-notes.json').read_text())
notes['validation'] = {'decoded_frames': 900, 'duration_seconds': seconds, 'unexpected_black_intervals': False, 'audio_peak_dbfs': peak, 'audio_channels': 2, 'audio_sample_rate_hz': 48000}
notes['file_mb'] = round(VIDEO.stat().st_size/1024/1024, 2)
(HERE / 'production-notes.json').write_text(json.dumps(notes, ensure_ascii=False, indent=2)+'\n')
print(json.dumps(notes['validation'], indent=2))
print(VIDEO)
