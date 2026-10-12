// A shared D minor/add9 palette keeps transitions harmonious when cues overlap.
const CUES = {
    enable: { notes: [146.83, 220, 329.63, 523.25], spacing: .13, duration: 1.8, attack: .12, level: .12 },
    tap: { notes: [659.25], spacing: 0, duration: .45, attack: .025, level: .07 },
    pulse: { notes: [293.66, 440, 659.25], spacing: .07, duration: 2, attack: .08, level: .11 },
    expand: { notes: [293.66, 349.23, 440, 523.25, 659.25], spacing: .105, duration: 1.7, attack: .1, level: .095 },
    collect: { notes: [659.25, 523.25, 440, 293.66], spacing: .12, duration: 1.9, attack: .1, level: .105 },
};
const MAX_VOICES = 22;
const AMBIENT_CHORDS = [
    [146.83, 174.61, 220, 329.63], // Dm(add9)
    [116.54, 146.83, 174.61, 220], // Bbmaj7
    [174.61, 220, 261.63, 392], // F(add9)
    [130.81, 164.81, 196, 293.66], // C(add9)
];

function makeImpulse(context) {
    const length = Math.ceil(context.sampleRate * 2.1);
    const buffer = context.createBuffer(2, length, context.sampleRate);
    let seed = 9173;
    for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel);
        for (let i = 0; i < length; i++) {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
            const fadeIn = Math.min(1, i / (context.sampleRate * .018));
            data[i] = (seed / 4294967296 * 2 - 1) * Math.pow(1 - i / length, 3.2) * fadeIn;
        }
    }
    return buffer;
}

// The effect graph is discarded on mute/pause, so old echoes cannot return.
function makeSpace(context, impulse) {
    const input = context.createGain();
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 18;
    compressor.ratio.value = 3;
    compressor.attack.value = .008;
    compressor.release.value = .25;
    const output = context.createGain();
    output.gain.value = .65;
    input.connect(compressor);
    compressor.connect(output);
    output.connect(context.destination);

    const delay = context.createDelay(1);
    delay.delayTime.value = .285;
    const feedback = context.createGain();
    feedback.gain.value = .26;
    const echoFilter = context.createBiquadFilter();
    echoFilter.type = 'lowpass';
    echoFilter.frequency.value = 1700;
    const echoWet = context.createGain();
    echoWet.gain.value = .19;
    input.connect(delay);
    delay.connect(echoFilter);
    echoFilter.connect(feedback);
    feedback.connect(delay);
    echoFilter.connect(echoWet);
    echoWet.connect(compressor);

    const reverb = context.createConvolver();
    reverb.buffer = impulse;
    const reverbFilter = context.createBiquadFilter();
    reverbFilter.type = 'lowpass';
    reverbFilter.frequency.value = 2600;
    const reverbWet = context.createGain();
    reverbWet.gain.value = .38;
    input.connect(reverb);
    reverb.connect(reverbFilter);
    reverbFilter.connect(reverbWet);
    reverbWet.connect(compressor);
    const nodes = [input, compressor, output, delay, feedback, echoFilter, echoWet, reverb, reverbFilter, reverbWet];
    return { input, dispose() { nodes.forEach(node => node.disconnect()); } };
}

export function createLandingSound(Context) {
    const context = new Context();
    const impulse = makeImpulse(context);
    let space = null;
    const voices = new Set();
    let enabled = false;
    let disposed = false;
    let lastCueAt = -Infinity;
    let generation = 0;
    let ambientTimer = null;
    let nextChordAt = 0;
    let nextNoteAt = 0;
    let chordIndex = 0;
    let melodyIndex = 0;
    let suspension = Promise.resolve();

    function release(voice) {
        if (!voices.delete(voice)) return;
        for (const oscillator of voice.oscillators) {
            oscillator.onended = null;
            try { oscillator.stop(); } catch { /* Already ended. */ }
            oscillator.disconnect();
        }
        voice.nodes.forEach(node => node.disconnect());
    }

    function stop() {
        generation++;
        clearInterval(ambientTimer);
        ambientTimer = null;
        for (const voice of [...voices]) release(voice);
        space?.dispose();
        space = null;
        lastCueAt = -Infinity;
    }

    function schedule(recipe, now, cue) {
        space ||= makeSpace(context, impulse);
        for (const [index, frequency] of recipe.notes.entries()) {
            // Steal the oldest voice instead of dropping an important new cue.
            while (voices.size >= MAX_VOICES) release(voices.values().next().value);
            const start = now + index * recipe.spacing;
            const end = start + recipe.duration;
            const envelope = context.createGain();
            envelope.gain.setValueAtTime(0, start);
            envelope.gain.linearRampToValueAtTime(recipe.level, start + recipe.attack);
            if (cue === 'ambient') {
                envelope.gain.linearRampToValueAtTime(recipe.level * .7, start + recipe.duration * .62);
            }
            envelope.gain.exponentialRampToValueAtTime(.0001, end);
            envelope.gain.setValueAtTime(0, end + .025);
            const filter = context.createBiquadFilter();
            filter.type = 'lowpass';
            filter.Q.value = .6;
            filter.frequency.setValueAtTime(cue === 'ambient' ? 1100 : cue === 'tap' ? 1800 : 2400, start);
            filter.frequency.exponentialRampToValueAtTime(550, end);
            envelope.connect(filter);
            filter.connect(space.input);
            const voice = { oscillators: [], nodes: [envelope, filter] };
            voices.add(voice);
            for (const [layer, detune] of [-7, 7, 0].entries()) {
                const oscillator = context.createOscillator();
                const level = context.createGain();
                const pan = context.createStereoPanner();
                oscillator.type = layer === 2 ? 'sine' : 'triangle';
                oscillator.frequency.value = frequency;
                oscillator.detune.setValueAtTime(detune, start);
                oscillator.detune.linearRampToValueAtTime(detune * .6, end);
                level.gain.value = layer === 2 ? .22 : .39;
                pan.pan.value = layer === 0 ? -.42 : layer === 1 ? .42 : 0;
                oscillator.connect(level);
                level.connect(pan);
                pan.connect(envelope);
                voice.oscillators.push(oscillator);
                voice.nodes.push(level, pan);
                if (layer === 2) oscillator.onended = () => release(voice);
                oscillator.start(start);
                oscillator.stop(end + .03);
            }
        }
    }

    function startAmbience() {
        if (ambientTimer !== null || !enabled || disposed) return;
        nextChordAt = context.currentTime + .2;
        nextNoteAt = nextChordAt + 1.8;
        chordIndex = 0;
        melodyIndex = 0;
        const tick = () => {
            if (!enabled || disposed || context.state !== 'running') return;
            const now = context.currentTime;
            if (nextChordAt < now - .5) nextChordAt = now + .05;
            if (nextNoteAt < now - .5) nextNoteAt = now + .1;
            if (nextChordAt < now + .4) {
                const notes = AMBIENT_CHORDS[chordIndex % AMBIENT_CHORDS.length];
                schedule({ notes, spacing: .035, duration: 8.6, attack: 1.7, level: .055 }, nextChordAt, 'ambient');
                nextChordAt += 7.2;
                chordIndex++;
            }
            if (nextNoteAt < now + .4) {
                const chord = AMBIENT_CHORDS[(chordIndex + AMBIENT_CHORDS.length - 1) % AMBIENT_CHORDS.length];
                const notes = [chord[[2, 3, 1, 3][melodyIndex % 4]] * 2];
                schedule({ notes, spacing: 0, duration: 2.8, attack: .22, level: .035 }, nextNoteAt, 'melody');
                nextNoteAt += 1.8;
                melodyIndex++;
            }
        };
        tick();
        ambientTimer = setInterval(tick, 250);
    }

    async function wake() {
        const currentGeneration = generation;
        await suspension;
        if (!enabled || disposed || generation !== currentGeneration) return false;
        if (context.state === 'suspended' || context.state === 'interrupted') await context.resume();
        return enabled && !disposed && generation === currentGeneration && context.state === 'running';
    }

    function suspend() {
        stop();
        if (context.state === 'running') suspension = context.suspend().catch(() => {});
    }

    async function play(cue = 'tap') {
        if (!enabled || disposed || !await wake()) return;
        startAmbience();
        const now = context.currentTime;
        if (now - lastCueAt < .1) return;
        lastCueAt = now;
        schedule(CUES[cue] || CUES.tap, now, cue);
    }

    return {
        play,
        async enable() {
            if (disposed) return;
            enabled = true;
            await play('enable');
        },
        disable() {
            enabled = false;
            suspend();
        },
        pause() { suspend(); },
        async resume() {
            if (enabled && !disposed && await wake()) startAmbience();
        },
        dispose() {
            disposed = true;
            enabled = false;
            stop();
            if (context.state !== 'closed') void context.close().catch(() => {});
        },
    };
}
