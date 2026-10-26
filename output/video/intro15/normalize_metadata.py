"""Normalize SDR color metadata without decoding or recompressing any frames."""
from pathlib import Path
import subprocess
import imageio_ffmpeg

HERE = Path(__file__).resolve().parent
FF = imageio_ffmpeg.get_ffmpeg_exe()

def normalize(file):
    temp = file.with_name(file.stem + '-tagged.mp4')
    result = subprocess.run([
        FF, '-hide_banner', '-loglevel', 'error', '-y', '-i', str(file),
        '-map', '0', '-c', 'copy', '-bsf:v',
        'h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1:video_full_range_flag=0',
        '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
        '-movflags', '+faststart+write_colr', str(temp)
    ], capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(result.stderr)
    temp.replace(file)
    probe = subprocess.run([FF, '-hide_banner', '-i', str(file)], capture_output=True, text=True)
    (HERE / (file.stem + '-metadata.log')).write_text(probe.stderr)
    stream = next(x for x in probe.stderr.splitlines() if 'Video:' in x)
    if 'bt709' not in stream or 'unknown' in stream:
        raise RuntimeError(stream)
    print(stream, flush=True)

if __name__ == '__main__':
    for name in ['spectra-intro-15s-4k.mp4', 'spectra-intro-15s-1080p.mp4']:
        normalize(HERE / name)
