// Sound manager — wraps positional audio, no-ops gracefully if files are absent
export class SoundManager {
  private audioContext: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  private async tryPlay(url: string): Promise<void> {
    try {
      const ctx = this.getContext();
      const res = await fetch(url);
      if (!res.ok) return;
      const buffer = await ctx.decodeAudioData(await res.arrayBuffer());
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
    } catch {
      // File absent or decode error — no-op
    }
  }

  playPowerOn(): void { void this.tryPlay('/audio/tv-power-on.mp3'); }
  playPowerOff(): void { void this.tryPlay('/audio/tv-power-off.mp3'); }
  playChannelChange(): void { void this.tryPlay('/audio/channel-change.mp3'); }
  playRemotePickup(): void { void this.tryPlay('/audio/remote-pickup.mp3'); }
}
