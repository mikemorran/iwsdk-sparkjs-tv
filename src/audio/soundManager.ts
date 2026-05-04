export class SoundManager {
  private ctx: AudioContext | null = null;
  private staticSource: AudioBufferSourceNode | null = null;
  private staticGain: GainNode | null = null;

  private getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private makeNoise(ctx: AudioContext, seconds: number): AudioBuffer {
    const frames = Math.ceil(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  private playNoise(
    seconds: number,
    filterType: BiquadFilterType,
    filterFreq: number,
    filterQ: number,
    peak: number,
    attackSec: number,
    releaseSec: number,
    startTime: number,
  ): void {
    const ctx = this.getCtx();
    const src = ctx.createBufferSource();
    src.buffer = this.makeNoise(ctx, seconds);

    const filt = ctx.createBiquadFilter();
    filt.type = filterType;
    filt.frequency.value = filterFreq;
    filt.Q.value = filterQ;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(peak, startTime + attackSec);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + releaseSec);

    src.connect(filt);
    filt.connect(gain);
    gain.connect(ctx.destination);
    src.start(startTime);
    src.stop(startTime + seconds);
  }

  playRemoteClick(): void {
    const ctx = this.getCtx();
    this.playNoise(0.05, 'bandpass', 1800, 1.5, 0.25, 0.002, 0.04, ctx.currentTime);
  }

  playPowerOn(): void {
    const ctx = this.getCtx();
    const now = ctx.currentTime;

    // CRT hum sweeps up
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(40, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.4);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.0001, now);
    oscGain.gain.exponentialRampToValueAtTime(0.12, now + 0.15);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.55);

    // Static burst
    this.playNoise(0.45, 'highpass', 2000, 0.5, 0.3, 0.05, 0.4, now);
  }

  playPowerOff(): void {
    const ctx = this.getCtx();
    const now = ctx.currentTime;

    // CRT hum sweeps down
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.12, now);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);

    // Quick static burst
    this.playNoise(0.2, 'highpass', 1500, 0.5, 0.4, 0.01, 0.18, now);
  }

  playChannelChange(): void {
    const ctx = this.getCtx();
    this.playNoise(0.3, 'highpass', 3000, 0.3, 0.6, 0.01, 0.28, ctx.currentTime);
  }

  startStaticLoop(): void {
    if (this.staticSource) return;
    const ctx = this.getCtx();

    const src = ctx.createBufferSource();
    src.buffer = this.makeNoise(ctx, 3.0);
    src.loop = true;

    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = 2500;
    filt.Q.value = 0.4;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.04, ctx.currentTime + 0.8);

    src.connect(filt);
    filt.connect(gain);
    gain.connect(ctx.destination);
    src.start();

    this.staticSource = src;
    this.staticGain = gain;
  }

  stopStaticLoop(): void {
    if (!this.staticSource || !this.staticGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.staticGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    const src = this.staticSource;
    setTimeout(() => { try { src.stop(); } catch { /* already stopped */ } }, 400);
    this.staticSource = null;
    this.staticGain = null;
  }
}

export const soundManager = new SoundManager();
