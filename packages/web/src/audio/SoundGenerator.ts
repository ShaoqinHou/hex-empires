/**
 * SoundGenerator - Synthesizes simple sounds using Web Audio API
 * Fallback when audio files are not available
 */

export class SoundGenerator {
  private audioContext: AudioContext | null;

  /**
   * @param ctx - Shared AudioContext provided by AudioManager. SoundGenerator
   *              does NOT create its own context — the caller is responsible for
   *              the context lifecycle and for closing it on dispose.
   */
  constructor(ctx: AudioContext | null = null) {
    this.audioContext = ctx;
  }

  playTone(frequency: number, duration: number, volume: number = 0.1): void {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  // ---------------------------------------------------------------------------
  // Named methods matching the bare-name convention used by AudioManager.
  // ---------------------------------------------------------------------------

  click(): void {
    this.playTone(800, 0.1, 0.05);
  }

  confirm(): void {
    this.playTone(1000, 0.15, 0.08);
  }

  select(): void {
    this.playTone(600, 0.1, 0.06);
  }

  error(): void {
    this.playTone(200, 0.2, 0.08);
  }

  unitMove(): void {
    this.playTone(400, 0.12, 0.06);
  }

  attack(): void {
    this.playTone(150, 0.18, 0.1);
  }

  death(): void {
    this.playTone(100, 0.3, 0.08);
  }

  cityFound(): void {
    this.playTone(1200, 0.25, 0.1);
  }

  victory(): void {
    this.playTone(1500, 0.4, 0.12);
  }

  defeat(): void {
    this.playTone(80, 0.5, 0.1);
  }
}
