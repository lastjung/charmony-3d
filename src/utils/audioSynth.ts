export type Instrument = 'piano' | 'xylophone' | 'bell' | 'marimba' | 'glass' | 'mech';

export const INSTRUMENTS: Instrument[] = [
  'piano',
  'xylophone',
  'bell',
  'marimba',
  'glass',
  'mech',
];

interface InstrumentTimbre {
  layers: Array<{
    type: OscillatorType;
    ratio: number;
    gain: number;
    detune?: number;
  }>;
  decay: number;
  attack: number;
  filterType: BiquadFilterType;
  filterStart: number;
  filterEnd: number;
  filterQ: number;
  gain: number;
}

interface ContinuousInstrumentVoicing {
  primary: OscillatorType;
  secondary: OscillatorType;
  detune: number;
  mix: number;
  baseGain: number;
  baseCutoff: number;
  cutoffRange: number;
  q: number;
  motionDepth: number;
}

export interface ContinuousSynth {
  oscA: OscillatorNode;
  oscB: OscillatorNode;
  gainA: GainNode;
  gainB: GainNode;
  master: GainNode;
  filter: BiquadFilterNode;
  panner: StereoPannerNode;
}

interface ImpactVoiceLayer {
  osc: OscillatorNode;
  gain: GainNode;
}

interface ImpactVoice {
  filter: BiquadFilterNode;
  output: GainNode;
  panner: StereoPannerNode;
  layers: ImpactVoiceLayer[];
  busyUntil: number;
  lastVelocity: number;
  startedAt: number;
}

export interface ImpactVoicePool {
  instrument: Instrument;
  voices: ImpactVoice[];
}

interface ImpactInstrumentConfig {
  poolSize: number;
  velocityFloor: number;
  velocityExponent: number;
}

export interface AdaptiveImpactResponse {
  velocityFloor: number;
  velocityExponent: number;
  priorityScale: number;
}

const IMPACT_TIMBRES: Record<Instrument, InstrumentTimbre> = {
  piano: {
    layers: [
      { type: 'triangle', ratio: 1, gain: 1 },
      { type: 'sine', ratio: 2, gain: 0.28, detune: 4 },
      { type: 'sine', ratio: 3, gain: 0.1, detune: -6 },
    ],
    attack: 0.003,
    decay: 1.15,
    filterType: 'lowpass',
    filterStart: 4800,
    filterEnd: 900,
    filterQ: 1.5,
    gain: 0.12,
  },
  xylophone: {
    layers: [
      { type: 'sine', ratio: 1, gain: 1 },
      { type: 'triangle', ratio: 3, gain: 0.42, detune: 3 },
      { type: 'sine', ratio: 5.2, gain: 0.18, detune: -5 },
    ],
    attack: 0.0015,
    decay: 0.75,
    filterType: 'bandpass',
    filterStart: 3200,
    filterEnd: 1800,
    filterQ: 3.5,
    gain: 0.11,
  },
  bell: {
    layers: [
      { type: 'sine', ratio: 1, gain: 1 },
      { type: 'sine', ratio: 2.71, gain: 0.5 },
      { type: 'sine', ratio: 4.18, gain: 0.28 },
    ],
    attack: 0.002,
    decay: 2.8,
    filterType: 'highpass',
    filterStart: 900,
    filterEnd: 300,
    filterQ: 0.8,
    gain: 0.1,
  },
  marimba: {
    layers: [
      { type: 'triangle', ratio: 1, gain: 1 },
      { type: 'sine', ratio: 2.4, gain: 0.2 },
      { type: 'sine', ratio: 4, gain: 0.08 },
    ],
    attack: 0.002,
    decay: 1.4,
    filterType: 'lowpass',
    filterStart: 3000,
    filterEnd: 650,
    filterQ: 2,
    gain: 0.1,
  },
  glass: {
    layers: [
      { type: 'sine', ratio: 1, gain: 1 },
      { type: 'sine', ratio: 2, gain: 0.42, detune: 6 },
      { type: 'sine', ratio: 3.6, gain: 0.16, detune: -8 },
    ],
    attack: 0.003,
    decay: 2.1,
    filterType: 'highpass',
    filterStart: 1400,
    filterEnd: 450,
    filterQ: 1.6,
    gain: 0.09,
  },
  mech: {
    layers: [
      { type: 'square', ratio: 1, gain: 1 },
      { type: 'sawtooth', ratio: 1.98, gain: 0.25, detune: 8 },
      { type: 'triangle', ratio: 0.5, gain: 0.15 },
    ],
    attack: 0.001,
    decay: 0.42,
    filterType: 'bandpass',
    filterStart: 1600,
    filterEnd: 500,
    filterQ: 5,
    gain: 0.09,
  },
};

const CONTINUOUS_VOICINGS: Record<Instrument, ContinuousInstrumentVoicing> = {
  piano: {
    primary: 'triangle',
    secondary: 'sine',
    detune: 2,
    mix: 0.24,
    baseGain: 0.03,
    baseCutoff: 700,
    cutoffRange: 1700,
    q: 1.3,
    motionDepth: 0.18,
  },
  xylophone: {
    primary: 'triangle',
    secondary: 'sine',
    detune: 7,
    mix: 0.2,
    baseGain: 0.026,
    baseCutoff: 1200,
    cutoffRange: 2200,
    q: 3.2,
    motionDepth: 0.28,
  },
  bell: {
    primary: 'sine',
    secondary: 'sine',
    detune: 12,
    mix: 0.35,
    baseGain: 0.022,
    baseCutoff: 900,
    cutoffRange: 2000,
    q: 1,
    motionDepth: 0.12,
  },
  marimba: {
    primary: 'triangle',
    secondary: 'sine',
    detune: 4,
    mix: 0.22,
    baseGain: 0.028,
    baseCutoff: 650,
    cutoffRange: 1500,
    q: 2.1,
    motionDepth: 0.2,
  },
  glass: {
    primary: 'sine',
    secondary: 'triangle',
    detune: 9,
    mix: 0.26,
    baseGain: 0.02,
    baseCutoff: 1100,
    cutoffRange: 2600,
    q: 1.5,
    motionDepth: 0.16,
  },
  mech: {
    primary: 'square',
    secondary: 'sawtooth',
    detune: 3,
    mix: 0.32,
    baseGain: 0.024,
    baseCutoff: 500,
    cutoffRange: 1200,
    q: 5.5,
    motionDepth: 0.45,
  },
};

const IMPACT_INSTRUMENT_CONFIGS: Record<Instrument, ImpactInstrumentConfig> = {
  piano: {
    poolSize: 16,
    velocityFloor: 0.34,
    velocityExponent: 1.2,
  },
  xylophone: {
    poolSize: 15,
    velocityFloor: 0.28,
    velocityExponent: 1.32,
  },
  bell: {
    poolSize: 18,
    velocityFloor: 0.38,
    velocityExponent: 1.08,
  },
  marimba: {
    poolSize: 14,
    velocityFloor: 0.32,
    velocityExponent: 1.18,
  },
  glass: {
    poolSize: 17,
    velocityFloor: 0.36,
    velocityExponent: 1.1,
  },
  mech: {
    poolSize: 12,
    velocityFloor: 0.4,
    velocityExponent: 0.96,
  },
};

export const getImpactInstrumentConfig = (instrument: Instrument): ImpactInstrumentConfig =>
  IMPACT_INSTRUMENT_CONFIGS[instrument];

export const getAdaptiveImpactResponse = (
  instrument: Instrument,
  density: number
): AdaptiveImpactResponse => {
  const config = IMPACT_INSTRUMENT_CONFIGS[instrument];
  const clampedDensity = Math.max(0, Math.min(1, density));

  return {
    velocityFloor: Math.min(0.62, config.velocityFloor + clampedDensity * 0.12),
    velocityExponent: Math.max(0.88, config.velocityExponent - clampedDensity * 0.18),
    priorityScale: 1 + clampedDensity * 0.24,
  };
};

export const createContinuousSynth = (
  ctx: AudioContext,
  instrument: Instrument
): ContinuousSynth => {
  const voicing = CONTINUOUS_VOICINGS[instrument];
  const oscA = ctx.createOscillator();
  const oscB = ctx.createOscillator();
  const gainA = ctx.createGain();
  const gainB = ctx.createGain();
  const master = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  const panner = ctx.createStereoPanner();

  oscA.type = voicing.primary;
  oscB.type = voicing.secondary;
  oscB.detune.value = voicing.detune;

  filter.type = 'lowpass';
  filter.Q.value = voicing.q;
  filter.frequency.value = voicing.baseCutoff;

  gainA.gain.value = voicing.baseGain;
  gainB.gain.value = voicing.baseGain * voicing.mix;
  master.gain.value = 0;

  oscA.connect(gainA);
  oscB.connect(gainB);
  gainA.connect(filter);
  gainB.connect(filter);
  filter.connect(master);
  master.connect(panner);
  panner.connect(ctx.destination);

  oscA.start();
  oscB.start();

  return { oscA, oscB, gainA, gainB, master, filter, panner };
};

export const updateContinuousSynth = (
  synth: ContinuousSynth,
  ctx: AudioContext,
  instrument: Instrument,
  params: { freq: number; pan: number; brightness: number; energy: number; motion: number }
) => {
  const voicing = CONTINUOUS_VOICINGS[instrument];
  const { freq, pan, brightness, energy, motion } = params;
  const now = ctx.currentTime;
  const modulatedFreq = freq * (1 + motion * voicing.motionDepth);

  synth.oscA.frequency.setTargetAtTime(modulatedFreq, now, 0.05);
  synth.oscB.frequency.setTargetAtTime(modulatedFreq * 1.5, now, 0.06);
  synth.filter.frequency.setTargetAtTime(
    voicing.baseCutoff + brightness * voicing.cutoffRange,
    now,
    0.08
  );
  synth.master.gain.setTargetAtTime(voicing.baseGain * 5 + energy * 0.18, now, 0.08);
  synth.panner.pan.setTargetAtTime(pan, now, 0.06);
};

export const releaseContinuousSynth = (synth: ContinuousSynth, ctx: AudioContext) => {
  const now = ctx.currentTime;
  synth.master.gain.cancelScheduledValues(now);
  synth.master.gain.setTargetAtTime(0, now, 0.06);
  window.setTimeout(() => {
    try {
      synth.oscA.stop();
      synth.oscB.stop();
    } catch {}
    synth.oscA.disconnect();
    synth.oscB.disconnect();
    synth.gainA.disconnect();
    synth.gainB.disconnect();
    synth.filter.disconnect();
    synth.master.disconnect();
    synth.panner.disconnect();
  }, 180);
};

const createImpactVoice = (ctx: AudioContext, instrument: Instrument): ImpactVoice => {
  const timbre = IMPACT_TIMBRES[instrument];
  const filter = ctx.createBiquadFilter();
  const output = ctx.createGain();
  const panner = ctx.createStereoPanner();
  const layers = timbre.layers.map((layer) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = layer.type;
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(filter);
    osc.start();
    return { osc, gain };
  });

  filter.type = timbre.filterType;
  filter.Q.value = timbre.filterQ;
  filter.frequency.value = timbre.filterStart;
  output.gain.value = 0.0001;
  panner.pan.value = 0;

  filter.connect(output);
  output.connect(panner);
  panner.connect(ctx.destination);

  return {
    filter,
    output,
    panner,
    layers,
    busyUntil: 0,
    lastVelocity: 0,
    startedAt: 0,
  };
};

const triggerImpactVoice = (
  voice: ImpactVoice,
  ctx: AudioContext,
  instrument: Instrument,
  freq: number,
  velocity: number,
  pan: number
) => {
  const timbre = IMPACT_TIMBRES[instrument];
  const now = ctx.currentTime;
  const safeVelocity = Math.max(0.2, velocity);
  const attackTime = now + timbre.attack;
  const releaseTime = now + timbre.decay;

  voice.filter.type = timbre.filterType;
  voice.filter.Q.cancelScheduledValues(now);
  voice.filter.frequency.cancelScheduledValues(now);
  voice.filter.Q.setValueAtTime(timbre.filterQ, now);
  voice.filter.frequency.setValueAtTime(timbre.filterStart, now);
  voice.filter.frequency.exponentialRampToValueAtTime(Math.max(80, timbre.filterEnd), releaseTime);

  voice.output.gain.cancelScheduledValues(now);
  voice.output.gain.setValueAtTime(0.0001, now);
  voice.output.gain.exponentialRampToValueAtTime(
    Math.max(0.0002, timbre.gain * safeVelocity),
    attackTime
  );
  voice.output.gain.exponentialRampToValueAtTime(0.0001, releaseTime);

  voice.panner.pan.cancelScheduledValues(now);
  voice.panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), now);

  voice.layers.forEach((voiceLayer, index) => {
    const layer = timbre.layers[index];
    voiceLayer.osc.type = layer.type;
    voiceLayer.osc.frequency.cancelScheduledValues(now);
    voiceLayer.osc.detune.cancelScheduledValues(now);
    voiceLayer.gain.gain.cancelScheduledValues(now);

    voiceLayer.osc.frequency.setValueAtTime(Math.max(40, freq * layer.ratio), now);
    voiceLayer.osc.detune.setValueAtTime(layer.detune ?? 0, now);
    voiceLayer.gain.gain.setValueAtTime(Math.max(0.0001, layer.gain * safeVelocity), now);
    voiceLayer.gain.gain.exponentialRampToValueAtTime(0.0001, now + timbre.decay * 0.9);
  });

  voice.busyUntil = releaseTime + 0.08;
  voice.lastVelocity = safeVelocity;
  voice.startedAt = now;
};

export const createImpactVoicePool = (
  ctx: AudioContext,
  instrument: Instrument,
  size = 12
): ImpactVoicePool => ({
  instrument,
  voices: Array.from({ length: size }, () => createImpactVoice(ctx, instrument)),
});

export const playPooledImpactVoice = (
  pool: ImpactVoicePool,
  ctx: AudioContext,
  instrument: Instrument,
  freq: number,
  velocity = 1,
  pan = 0,
  priority = velocity
) => {
  if (pool.instrument !== instrument) {
    pool.instrument = instrument;
  }

  const now = ctx.currentTime;
  let selectedVoice = pool.voices[0];
  let bestStealScore = Number.POSITIVE_INFINITY;

  for (const voice of pool.voices) {
    if (voice.busyUntil <= now) {
      selectedVoice = voice;
      break;
    }

    const remaining = Math.max(0, voice.busyUntil - now);
    const age = Math.max(0, now - voice.startedAt);
    const stealScore = voice.lastVelocity * 0.75 + remaining * 0.2 - age * 0.08;

    if (stealScore < bestStealScore) {
      bestStealScore = stealScore;
      selectedVoice = voice;
    }
  }

  if (selectedVoice.busyUntil > now) {
    const currentImportance = selectedVoice.lastVelocity * 0.7 + Math.max(0, selectedVoice.busyUntil - now) * 0.25;
    const incomingImportance = Math.max(0.2, priority) * 0.9 + velocity * 0.35;
    if (incomingImportance < currentImportance * 0.72) {
      return;
    }
  }

  triggerImpactVoice(selectedVoice, ctx, instrument, freq, velocity, pan);
};

export const disposeImpactVoicePool = (pool: ImpactVoicePool) => {
  pool.voices.forEach((voice) => {
    voice.layers.forEach((layer) => {
      try {
        layer.osc.stop();
      } catch {}
      layer.osc.disconnect();
      layer.gain.disconnect();
    });
    voice.filter.disconnect();
    voice.output.disconnect();
    voice.panner.disconnect();
  });
  pool.voices = [];
};

export const playImpactVoice = (
  ctx: AudioContext,
  instrument: Instrument,
  freq: number,
  velocity = 1,
  pan = 0
) => {
  const timbre = IMPACT_TIMBRES[instrument];
  const now = ctx.currentTime;
  const filter = ctx.createBiquadFilter();
  const output = ctx.createGain();
  const panner = ctx.createStereoPanner();

  filter.type = timbre.filterType;
  filter.Q.value = timbre.filterQ;
  filter.frequency.setValueAtTime(timbre.filterStart, now);
  filter.frequency.exponentialRampToValueAtTime(
    Math.max(80, timbre.filterEnd),
    now + timbre.decay
  );

  output.gain.setValueAtTime(0.0001, now);
  output.gain.exponentialRampToValueAtTime(
    Math.max(0.0002, timbre.gain * velocity),
    now + timbre.attack
  );
  output.gain.exponentialRampToValueAtTime(0.0001, now + timbre.decay);

  panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), now);

  timbre.layers.forEach((layer) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = layer.type;
    osc.frequency.setValueAtTime(Math.max(40, freq * layer.ratio), now);
    osc.detune.setValueAtTime(layer.detune ?? 0, now);
    gain.gain.setValueAtTime(Math.max(0.0001, layer.gain * velocity), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + timbre.decay * 0.9);
    osc.connect(gain);
    gain.connect(filter);
    osc.start(now);
    osc.stop(now + timbre.decay + 0.08);
  });

  filter.connect(output);
  output.connect(panner);
  panner.connect(ctx.destination);

  window.setTimeout(() => {
    filter.disconnect();
    output.disconnect();
    panner.disconnect();
  }, (timbre.decay + 0.2) * 1000);
};
