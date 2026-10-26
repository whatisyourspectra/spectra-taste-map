#!/usr/bin/env python3
"""Original procedural score for the 15-second SPECTRA identity film.

Pure Python standard library, no samples, presets, or third-party music.
Writes 48 kHz, stereo, 24-bit PCM WAV. All random material is seeded.
"""
from array import array
import json
import math
from pathlib import Path
import random
import wave

OUT = Path(__file__).resolve().parent
SR = 48000
DURATION = 15.0
COUNT = int(SR * DURATION)
TAU = 2 * math.pi
left = array('f', [0.0]) * COUNT
right = array('f', [0.0]) * COUNT
rng = random.Random(10415)


def ease(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def freq(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def gains(pan):
    angle = (pan + 1) * math.pi / 4
    return math.cos(angle), math.sin(angle)


def add_pad(start, duration, notes, level, width=0.70):
    """Soft detuned oscillators, slow moving harmonics, no hard edges."""
    for voice, midi in enumerate(notes):
        f = freq(midi)
        phase = rng.random() * TAU
        pan = width * (2 * voice / max(1, len(notes) - 1) - 1)
        gl, gr = gains(pan)
        begin = max(0, int(start * SR))
        end = min(COUNT, int((start + duration) * SR))
        scale = level / math.sqrt(len(notes))
        for n in range(begin, end):
            t = n / SR - start
            envelope = ease(t / .72) * ease((duration - t) / .95)
            drift = .0022 * math.sin(t * .57 + voice)
            p = TAU * f * t
            tone = (.57 * math.sin(p * 1.0008 + phase + drift)
                    + .34 * math.sin(p * .9989 + phase + .6)
                    + .075 * math.sin(2 * p + .3)
                    + .027 * math.sin(3 * p + .8))
            breath = .92 + .08 * math.sin(TAU * .14 * t + voice)
            value = tone * envelope * scale * breath
            left[n] += value * gl
            right[n] += value * gr


def add_bell(start, midi, level=.14, pan=0, duration=2.8, bright=1.0):
    """Original glass/sine motif with gentle FM and a diffuse tail."""
    f = freq(midi)
    gl, gr = gains(pan)
    end = min(COUNT, int((start + duration) * SR))
    for n in range(max(0, int(start * SR)), end):
        t = n / SR - start
        attack = ease(t / .018)
        env = attack * math.exp(-2.5 * t / duration) * ease((duration - t) / .25)
        p = TAU * f * t
        modulation = bright * .21 * math.sin(p * 2.003) * math.exp(-t * 5.4)
        value = (math.sin(p + modulation)
                 + .13 * math.sin(p * 2.002) * math.exp(-t * 2.2)
                 + .035 * math.sin(p * 3.997) * math.exp(-t * 5))
        value *= level * env
        left[n] += value * gl
        right[n] += value * gr


def add_pulse(start, strong=False, pan=0):
    """Round low pulse, closer to a heartbeat than an EDM kick."""
    gl, gr = gains(pan)
    level = .22 if strong else .095
    duration = .68 if strong else .44
    for n in range(max(0, int(start * SR)), min(COUNT, int((start + duration) * SR))):
        t = n / SR - start
        # Integral of an exponential pitch drop, landing on D2.
        phase = TAU * (73.416 * t + 43 * (1 - math.exp(-t * 21)) / 21)
        env = ease(t / .009) * math.exp(-t * (6.7 if strong else 10.0))
        tone = math.sin(phase) + .12 * math.sin(2 * phase) * math.exp(-t * 15)
        value = level * env * tone
        left[n] += value * gl
        right[n] += value * gr


def add_whoosh(start, duration, level=.075, direction=1):
    """Pinkish, band limited, stereo moving noise sweep."""
    fast = slow = 0.0
    for n in range(max(0, int(start * SR)), min(COUNT, int((start + duration) * SR))):
        t = n / SR - start
        u = t / duration
        env = math.sin(math.pi * u) ** 2
        noise = rng.uniform(-1, 1)
        cutoff = 500 + 3900 * (u if direction > 0 else 1 - u) ** 2
        a = 1 - math.exp(-TAU * cutoff / SR)
        b = 1 - math.exp(-TAU * 180 / SR)
        fast += a * (noise - fast)
        slow += b * (noise - slow)
        value = (fast - slow) * env * level
        gl, gr = gains(direction * (.7 - 1.4 * u))
        left[n] += value * gl
        right[n] += value * gr


def add_tick(start, level, pan):
    gl, gr = gains(pan)
    smooth_noise = 0.0
    duration = .07
    for n in range(max(0, int(start * SR)), min(COUNT, int((start + duration) * SR))):
        t = n / SR - start
        raw = rng.uniform(-1, 1)
        smooth_noise += .14 * (raw - smooth_noise)
        env = ease(t / .003) * math.exp(-t * 75)
        value = (raw - smooth_noise) * level * env
        left[n] += value * gl
        right[n] += value * gr


# Harmonic bed: D minor add9 -> Fmaj9 -> Bbmaj7 -> Cadd9 -> Dm9.
# Chord overlaps are intentional: the music morphs with the landing sculpture.
add_pad(-.35, 3.8, [50, 57, 60, 64, 69], .115)
add_pad(2.15, 4.05, [53, 60, 64, 67, 69], .123)
add_pad(4.85, 4.25, [46, 57, 62, 65, 69], .135)
add_pad(7.80, 4.30, [48, 55, 62, 64, 67], .134)
add_pad(11.18, 3.82, [50, 57, 60, 64, 69, 74], .165, .88)

# The first signal is immediate; the resolved logo chord is deliberately broad.
for start in [.10, 2.0, 5.0, 8.0, 11.5]:
    add_pulse(start, strong=True)
for beat in range(1, 18):
    start = .125 + beat * .625
    if all(abs(start - cut) > .20 for cut in [2, 5, 8, 11.5]):
        add_pulse(start, pan=.06 * (-1 if beat % 2 else 1))

motif = [
    (.16, 74, .142, -.35), (.43, 81, .117, .32), (.83, 88, .073, -.18),
    (2.18, 77, .110, -.48), (2.71, 76, .105, .36), (3.28, 81, .092, -.12),
    (5.08, 74, .125, -.55), (5.39, 77, .111, -.12), (5.70, 81, .108, .40),
    (6.32, 88, .073, .12), (6.94, 84, .068, -.38),
    (8.10, 79, .107, -.52), (8.43, 84, .097, -.10), (8.76, 88, .078, .50),
    (9.38, 86, .082, .24), (10.0, 84, .080, -.30),
    (11.50, 74, .132, -.32), (11.54, 81, .101, .30),
    (11.58, 88, .076, .08), (12.12, 86, .059, -.14),
]
for start, midi, level, pan in motif:
    add_bell(start, midi, level, pan, duration=3.0 if start > 11 else 2.35)

for start, duration, level, direction in [
    (0, .56, .048, 1), (1.50, .76, .068, -1),
    (4.44, .76, .075, 1), (7.37, .94, .078, -1),
    (10.75, 1.05, .091, 1),
]:
    add_whoosh(start, duration, level, direction)

# Tiny moving dust accents create motion in the album and constellation shots.
for i in range(21):
    add_tick(5.16 + i * .3125, .024 if i % 2 == 0 else .015, .65 * math.sin(i * 2.4))

# Low level filtered air, never a flat hiss. It opens for the final resolve.
noise_l = noise_r = 0.0
for n in range(COUNT):
    t = n / SR
    noise_l += .015 * (rng.uniform(-1, 1) - noise_l)
    noise_r += .015 * (rng.uniform(-1, 1) - noise_r)
    envelope = ease(t / .8) * ease((15 - t) / 1.25)
    envelope *= .004 + .004 * ease((t - 8) / 3.5)
    left[n] += noise_l * envelope
    right[n] += noise_r * envelope

# Stereo echo and a set of decorrelated, damped feedback delays. All are
# generated directly from this score; no external impulse response is used.
dry_l = array('f', left)
dry_r = array('f', right)
for delay_s, mix, cross in [(.15625, .105, True), (.3125, .082, True), (.46875, .047, False)]:
    delay = int(delay_s * SR)
    for n in range(delay, COUNT):
        left[n] += (dry_r[n-delay] if cross else dry_l[n-delay]) * mix
        right[n] += (dry_l[n-delay] if cross else dry_r[n-delay]) * mix

for delay_s, wet, feedback, cross in [
    (.0613, .029, .63, False), (.0797, .028, .66, True),
    (.1019, .025, .68, False), (.1313, .024, .70, True),
    (.1733, .022, .69, False), (.2117, .018, .67, True),
]:
    delay = int(delay_s * SR)
    buf_l = array('f', [0.0]) * delay
    buf_r = array('f', [0.0]) * delay
    low_l = low_r = 0.0
    for n in range(COUNT):
        p = n % delay
        low_l += .23 * (buf_l[p] - low_l)
        low_r += .23 * (buf_r[p] - low_r)
        left[n] += low_l * wet
        right[n] += low_r * wet
        buf_l[p] = dry_l[n] + feedback * (low_r if cross else low_l)
        buf_r[p] = dry_r[n] + feedback * (low_l if cross else low_r)

# Remove any residual DC and gently round the highest transient. Conservative
# -1.6 dBFS peak provides headroom for the final AAC encode's intersample peaks.
mean_l = sum(left) / COUNT
mean_r = sum(right) / COUNT
peak = 0.0
for n in range(COUNT):
    t = n / SR
    fade = ease(t / .012) * ease((15 - t) / .90)
    left[n] = math.tanh((left[n] - mean_l) * 1.12) * fade
    right[n] = math.tanh((right[n] - mean_r) * 1.12) * fade
    peak = max(peak, abs(left[n]), abs(right[n]))
target = 10 ** (-1.6 / 20)
gain = target / max(peak, 1e-9)

square = peak_out = 0.0
dest = OUT / 'score.wav'
with wave.open(str(dest), 'wb') as wav:
    wav.setnchannels(2)
    wav.setsampwidth(3)
    wav.setframerate(SR)
    block = bytearray()
    for n in range(COUNT):
        for data in [left, right]:
            value = data[n] * gain
            peak_out = max(peak_out, abs(value))
            square += value * value
            pcm = int(round(value * 8388607))
            block.extend((pcm & 0xffffff).to_bytes(3, byteorder='little'))
        if len(block) >= 65532:
            wav.writeframesraw(block)
            block.clear()
    if block:
        wav.writeframesraw(block)

notes = {
    'title': 'SPECTRA — Shape / Signal (Original 15-second brand score)',
    'duration_seconds': DURATION,
    'sample_rate_hz': SR,
    'channels': 2,
    'bit_depth': 24,
    'peak_dbfs': round(20 * math.log10(peak_out), 3),
    'rms_dbfs': round(20 * math.log10(math.sqrt(square / (2 * COUNT))), 3),
    'sound': 'Warm ambient electronic pads, round low pulse, delicate original glass motif, stereo filtered transition sweeps.',
    'timings': {
        '0–2s': 'Immediate D signal, low pulse, airy macro sweep.',
        '2–5s': 'Warm broad Fmaj9 pad, unhurried glass notes.',
        '5–8s': 'Album cluster pulse and tiny stereo dust accents.',
        '8–11.5s': 'Ascending constellation signal and widening air.',
        '11.5–15s': 'Dm9 identity chord / bell resolve, soft 900ms fade to exact silence.',
    },
    'provenance': 'Direct procedural synthesis written for this film; no samples, commercial recording, third-party music, or external impulse response used.',
    'reproduce': 'python3 output/video/intro15/generate_score.py',
}
(OUT / 'score-notes.json').write_text(json.dumps(notes, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(notes, ensure_ascii=False, indent=2))
print(dest)
