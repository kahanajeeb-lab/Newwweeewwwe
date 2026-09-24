import { VoiceEffectId } from '../types';

let audioCtx: AudioContext | null = null;
let ringtoneInterval: any = null;

export function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(console.error);
  }
  return audioCtx;
}

/**
 * Creates an audio graph applying the chosen voice effect to a MediaStreamAudioSourceNode
 */
export function applyVoiceEffectToStream(
  ctx: AudioContext,
  sourceNode: MediaStreamAudioSourceNode,
  effectId: VoiceEffectId
): AudioNode {
  // Disconnect any existing routing
  switch (effectId) {
    case 'soft': {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 3200;
      filter.Q.value = 0.7;
      sourceNode.connect(filter);
      return filter;
    }
    case 'deep': {
      const lowShelf = ctx.createBiquadFilter();
      lowShelf.type = 'lowshelf';
      lowShelf.frequency.value = 250;
      lowShelf.gain.value = 7;

      const highShelf = ctx.createBiquadFilter();
      highShelf.type = 'highshelf';
      highShelf.frequency.value = 2800;
      highShelf.gain.value = -4;

      sourceNode.connect(lowShelf);
      lowShelf.connect(highShelf);
      return highShelf;
    }
    case 'bright': {
      const highShelf = ctx.createBiquadFilter();
      highShelf.type = 'highshelf';
      highShelf.frequency.value = 3500;
      highShelf.gain.value = 6;
      sourceNode.connect(highShelf);
      return highShelf;
    }
    case 'young_style': {
      const band = ctx.createBiquadFilter();
      band.type = 'peaking';
      band.frequency.value = 2200;
      band.gain.value = 5;
      band.Q.value = 1.2;

      const lowCut = ctx.createBiquadFilter();
      lowCut.type = 'highpass';
      lowCut.frequency.value = 300;

      sourceNode.connect(lowCut);
      lowCut.connect(band);
      return band;
    }
    case 'low_tone': {
      const peak = ctx.createBiquadFilter();
      peak.type = 'peaking';
      peak.frequency.value = 180;
      peak.gain.value = 9;
      peak.Q.value = 1.5;
      sourceNode.connect(peak);
      return peak;
    }
    case 'high_tone': {
      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 700;

      const peak = ctx.createBiquadFilter();
      peak.type = 'peaking';
      peak.frequency.value = 3400;
      peak.gain.value = 6;
      peak.Q.value = 1.0;

      sourceNode.connect(highpass);
      highpass.connect(peak);
      return peak;
    }
    case 'warm': {
      const mid = ctx.createBiquadFilter();
      mid.type = 'peaking';
      mid.frequency.value = 500;
      mid.gain.value = 4.5;

      const waveshaper = ctx.createWaveShaper();
      waveshaper.curve = makeDistortionCurve(10);
      waveshaper.oversample = '2x';

      sourceNode.connect(mid);
      mid.connect(waveshaper);
      return waveshaper;
    }
    case 'echo': {
      const delay = ctx.createDelay(1.0);
      delay.delayTime.value = 0.22;

      const feedback = ctx.createGain();
      feedback.gain.value = 0.35;

      const dryGain = ctx.createGain();
      dryGain.gain.value = 0.8;

      const wetGain = ctx.createGain();
      wetGain.gain.value = 0.5;

      const merger = ctx.createGain();

      sourceNode.connect(dryGain);
      dryGain.connect(merger);

      sourceNode.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);

      delay.connect(wetGain);
      wetGain.connect(merger);

      return merger;
    }
    case 'studio': {
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.setValueAtTime(-24, ctx.currentTime);
      comp.knee.setValueAtTime(30, ctx.currentTime);
      comp.ratio.setValueAtTime(4, ctx.currentTime);
      comp.attack.setValueAtTime(0.003, ctx.currentTime);
      comp.release.setValueAtTime(0.25, ctx.currentTime);

      const eq = ctx.createBiquadFilter();
      eq.type = 'peaking';
      eq.frequency.value = 1200;
      eq.gain.value = 2;

      sourceNode.connect(comp);
      comp.connect(eq);
      return eq;
    }
    case 'natural':
    default: {
      const bypass = ctx.createGain();
      bypass.gain.value = 1.0;
      sourceNode.connect(bypass);
      return bypass;
    }
  }
}

function makeDistortionCurve(amount = 20) {
  const k = typeof amount === 'number' ? amount : 20;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

/**
 * Ringtone synthesizer for incoming/outgoing calls
 */
export function startRingtone(isIncoming: boolean) {
  stopRingtone();
  const ctx = getAudioContext();

  const playChime = () => {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const now = ctx.currentTime;

      if (isIncoming) {
        // Melodic romantic chime (A4 -> C#5 -> E5)
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(554.37, now + 0.15);
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.35);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.75);
      } else {
        // Soft standard outgoing ring sound (440Hz + 480Hz dual tone)
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 1.25);
      }
    } catch (e) {
      console.warn("Ringtone playback error:", e);
    }
  };

  playChime();
  ringtoneInterval = setInterval(playChime, isIncoming ? 2200 : 3000);
}

export function stopRingtone() {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
}

/**
 * Vibrate once for calls (Requirement: vibrate ONCE when call starts/rings)
 */
export function vibrateOnce(ms = 250) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(ms);
    } catch (e) {
      console.warn("Vibration not permitted:", e);
    }
  }
}
