/**
 * SoundGenerator - Synthesizes simple sounds using Web Audio API
 * Fallback when audio files are not available
 */

export class SoundGenerator {
  private audioContext: AudioContext | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      this.audioContext = new AudioContext();
    }
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

  playClick(): void {
    this.playTone(800, 0.1, 0.05);
  }

  playConfirm(): void {
    this.playTone(1000, 0.15, 0.08);
  }

  playSelect(): void {
    this.playTone(600, 0.1, 0.06);
  }

  playError(): void {
    this.playTone(200, 0.2, 0.08);
  }
}
