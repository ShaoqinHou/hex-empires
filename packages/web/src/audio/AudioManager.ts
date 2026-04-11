/**
 * AudioManager handles all audio playback for the game.
 * Supports sound effects, background music, and volume controls.
 * Falls back to synthesized sounds when audio files are not available.
 */

import { SoundGenerator } from './SoundGenerator';

export type SoundEffect =
  | 'unit_move'
  | 'unit_attack'
  | 'unit_ranged_attack'
  | 'unit_death'
  | 'unit_select'
  | 'city_found'
  | 'city_capture'
  | 'building_complete'
  | 'tech_complete'
  | 'turn_start'
  | 'turn_end'
  | 'click'
  | 'confirm'
  | 'error'
  | 'victory'
  | 'defeat';

export type MusicTrack =
  | 'antiquity'
  | 'exploration'
  | 'modern'
  | 'peace'
  | 'war';

export interface AudioManagerConfig {
  readonly soundEnabled: boolean;
  readonly musicEnabled: boolean;
  readonly soundVolume: number; // 0.0 to 1.0
  readonly musicVolume: number; // 0.0 to 1.0
}

interface SoundEffectDefinition {
  readonly url: string;
  readonly volume: number; // Base volume multiplier for this sound
  readonly pitch?: number; // Optional pitch variation
}

interface MusicTrackDefinition {
  readonly url: string;
  readonly loop: boolean;
  readonly fadeIn?: number; // Fade in duration in ms
  readonly fadeOut?: number; // Fade out duration in ms
}

/**
 * Sound effect definitions using Web Audio API.
 * For now, these are placeholder URLs - in production, these would be actual audio files.
 */
const SOUND_EFFECTS: Record<SoundEffect, SoundEffectDefinition> = {
  unit_move: {
    url: '/sounds/unit_move.mp3',
    volume: 0.3,
  },
  unit_attack: {
    url: '/sounds/unit_attack.mp3',
    volume: 0.5,
  },
  unit_ranged_attack: {
    url: '/sounds/unit_ranged_attack.mp3',
    volume: 0.4,
  },
  unit_death: {
    url: '/sounds/unit_death.mp3',
    volume: 0.5,
  },
  unit_select: {
    url: '/sounds/unit_select.mp3',
    volume: 0.3,
  },
  city_found: {
    url: '/sounds/city_found.mp3',
    volume: 0.6,
  },
  city_capture: {
    url: '/sounds/city_capture.mp3',
    volume: 0.7,
  },
  building_complete: {
    url: '/sounds/building_complete.mp3',
    volume: 0.4,
  },
  tech_complete: {
    url: '/sounds/tech_complete.mp3',
    volume: 0.5,
  },
  turn_start: {
    url: '/sounds/turn_start.mp3',
    volume: 0.3,
  },
  turn_end: {
    url: '/sounds/turn_end.mp3',
    volume: 0.3,
  },
  click: {
    url: '/sounds/click.mp3',
    volume: 0.2,
  },
  confirm: {
    url: '/sounds/confirm.mp3',
    volume: 0.3,
  },
  error: {
    url: '/sounds/error.mp3',
    volume: 0.4,
  },
  victory: {
    url: '/sounds/victory.mp3',
    volume: 0.7,
  },
  defeat: {
    url: '/sounds/defeat.mp3',
    volume: 0.7,
  },
};

/**
 * Music track definitions.
 * These would be actual audio files in production.
 */
const MUSIC_TRACKS: Record<MusicTrack, MusicTrackDefinition> = {
  antiquity: {
    url: '/music/antiquity.mp3',
    loop: true,
    fadeIn: 2000,
    fadeOut: 1500,
  },
  exploration: {
    url: '/music/exploration.mp3',
    loop: true,
    fadeIn: 2000,
    fadeOut: 1500,
  },
  modern: {
    url: '/music/modern.mp3',
    loop: true,
    fadeIn: 2000,
    fadeOut: 1500,
  },
  peace: {
    url: '/music/peace.mp3',
    loop: true,
    fadeIn: 3000,
    fadeOut: 2000,
  },
  war: {
    url: '/music/war.mp3',
    loop: true,
    fadeIn: 1000,
    fadeOut: 1000,
  },
};

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private config: AudioManagerConfig;
  private musicGainNode: GainNode | null = null;
  private soundGainNode: GainNode | null = null;
  private currentMusicTrack: HTMLAudioElement | null = null;
  private currentMusicTrackName: MusicTrack | null = null;
  private soundCache: Map<SoundEffect, AudioBuffer> = new Map();
  private soundGenerator: SoundGenerator | null = null;

  constructor(config: AudioManagerConfig = {
    soundEnabled: true,
    musicEnabled: true,
    soundVolume: 0.5,
    musicVolume: 0.3,
  }) {
    this.config = config;
  }

  /**
   * Initialize the audio system. Must be called after user interaction due to browser autoplay policies.
   */
  async initialize(): Promise<void> {
    if (this.audioContext) return;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Create gain nodes for volume control
      this.musicGainNode = this.audioContext.createGain();
      this.musicGainNode.gain.value = this.config.musicEnabled ? this.config.musicVolume : 0;
      this.musicGainNode.connect(this.audioContext.destination);

      this.soundGainNode = this.audioContext.createGain();
      this.soundGainNode.gain.value = this.config.soundEnabled ? this.config.soundVolume : 0;
      this.soundGainNode.connect(this.audioContext.destination);

      // Create sound generator for fallback synthesized sounds
      this.soundGenerator = new SoundGenerator(this.audioContext);

      // Preload commonly used sound effects
      await this.preloadSounds(['unit_move', 'unit_attack', 'click', 'confirm', 'error']);

      console.log('AudioManager initialized successfully');
    } catch (error) {
      console.warn('Failed to initialize AudioManager:', error);
    }
  }

  /**
   * Preload sound effects to avoid latency during gameplay.
   */
  private async preloadSounds(sounds: SoundEffect[]): Promise<void> {
    if (!this.audioContext) return;

    const loadPromises = sounds.map(async (sound) => {
      if (this.soundCache.has(sound)) return;

      try {
        const response = await fetch(SOUND_EFFECTS[sound].url);
        if (!response.ok) {
          console.warn(`Failed to load sound: ${sound}`);
          return;
        }

        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        this.soundCache.set(sound, audioBuffer);
      } catch (error) {
        console.warn(`Failed to preload sound: ${sound}`, error);
      }
    });

    await Promise.allSettled(loadPromises);
  }

  /**
   * Play a sound effect.
   */
  async playSound(effect: SoundEffect, volume: number = 1.0): Promise<void> {
    if (!this.audioContext || !this.soundGainNode || !this.config.soundEnabled) {
      return;
    }

    // Resume audio context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    try {
      const soundDef = SOUND_EFFECTS[effect];
      let audioBuffer = this.soundCache.get(effect);

      // Load sound if not cached
      if (!audioBuffer) {
        const response = await fetch(soundDef.url);
        if (!response.ok) {
          console.warn(`Failed to load sound: ${effect}`);
          return;
        }

        const arrayBuffer = await response.arrayBuffer();
        audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        this.soundCache.set(effect, audioBuffer);
      }

      // Create source and gain nodes for this sound
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;

      const gainNode = this.audioContext.createGain();
      const finalVolume = soundDef.volume * volume * this.config.soundVolume;
      gainNode.gain.value = finalVolume;

      // Connect nodes
      source.connect(gainNode);
      gainNode.connect(this.soundGainNode);

      source.start(0);
    } catch (error) {
      console.warn(`Failed to play sound: ${effect}`, error);

      // Fallback to synthesized sound
      if (this.soundGenerator && this.soundGainNode) {
        this.playSynthesizedSound(effect);
      }
    }
  }

  /**
   * Play a synthesized sound as fallback when audio files are not available.
   */
  private playSynthesizedSound(effect: SoundEffect): void {
    if (!this.soundGenerator || !this.soundGainNode) return;

    switch (effect) {
      case 'unit_move':
        this.soundGenerator.unitMove();
        break;
      case 'unit_attack':
        this.soundGenerator.attack();
        break;
      case 'unit_ranged_attack':
        this.soundGenerator.attack();
        break;
      case 'unit_death':
        this.soundGenerator.death();
        break;
      case 'unit_select':
        this.soundGenerator.click();
        break;
      case 'city_found':
        this.soundGenerator.cityFound();
        break;
      case 'city_capture':
        this.soundGenerator.victory(); // Temporary: use victory sound for city capture
        break;
      case 'building_complete':
        this.soundGenerator.confirm(); // Temporary: use confirm sound
        break;
      case 'tech_complete':
        this.soundGenerator.confirm(); // Temporary: use confirm sound
        break;
      case 'turn_start':
        this.soundGenerator.click();
        break;
      case 'turn_end':
        this.soundGenerator.click();
        break;
      case 'click':
        this.soundGenerator.click();
        break;
      case 'confirm':
        this.soundGenerator.confirm();
        break;
      case 'error':
        this.soundGenerator.error();
        break;
      case 'victory':
        this.soundGenerator.victory();
        break;
      case 'defeat':
        this.soundGenerator.defeat();
        break;
    }
  }

  /**
   * Play a music track.
   * Fades out the current track and fades in the new one.
   */
  async playMusic(track: MusicTrack, immediate: boolean = false): Promise<void> {
    if (!this.config.musicEnabled) return;

    // If same track is playing, do nothing
    if (this.currentMusicTrackName === track && this.currentMusicTrack) {
      return;
    }

    // Stop current track with fade out
    if (this.currentMusicTrack) {
      const currentTrackDef = MUSIC_TRACKS[this.currentMusicTrackName!];
      await this.fadeOutMusic(currentTrackDef.fadeOut || 1500);
      this.currentMusicTrack.pause();
      this.currentMusicTrack = null;
    }

    // Start new track
    const trackDef = MUSIC_TRACKS[track];

    // For music, we use HTMLAudioElement for better looping and streaming support
    const audio = new HTMLAudioElement(trackDef.url);
    audio.loop = trackDef.loop;
    audio.volume = 0; // Start at 0 for fade in

    this.currentMusicTrack = audio;
    this.currentMusicTrackName = track;

    try {
      await audio.play();

      if (!immediate && trackDef.fadeIn) {
        await this.fadeInMusic(audio, trackDef.fadeIn, this.config.musicVolume);
      } else {
        audio.volume = this.config.musicVolume;
      }
    } catch (error) {
      console.warn(`Failed to play music: ${track}`, error);
      this.currentMusicTrack = null;
      this.currentMusicTrackName = null;
    }
  }

  /**
   * Stop music with fade out.
   */
  async stopMusic(): Promise<void> {
    if (!this.currentMusicTrack) return;

    const trackDef = this.currentMusicTrackName ? MUSIC_TRACKS[this.currentMusicTrackName] : null;
    const fadeDuration = trackDef?.fadeOut || 1500;

    await this.fadeOutMusic(fadeDuration);
    this.currentMusicTrack.pause();
    this.currentMusicTrack = null;
    this.currentMusicTrackName = null;
  }

  /**
   * Fade in music track.
   */
  private async fadeInMusic(audio: HTMLAudioElement, duration: number, targetVolume: number): Promise<void> {
    const steps = 20;
    const stepDuration = duration / steps;
    const volumeIncrement = targetVolume / steps;

    for (let i = 0; i <= steps; i++) {
      audio.volume = Math.min(targetVolume, (i + 1) * volumeIncrement);
      await new Promise(resolve => setTimeout(resolve, stepDuration));
    }
  }

  /**
   * Fade out music track.
   */
  private async fadeOutMusic(duration: number): Promise<void> {
    if (!this.currentMusicTrack) return;

    const startVolume = this.currentMusicTrack.volume;
    const steps = 20;
    const stepDuration = duration / steps;
    const volumeDecrement = startVolume / steps;

    for (let i = 0; i <= steps; i++) {
      if (this.currentMusicTrack) {
        this.currentMusicTrack.volume = Math.max(0, startVolume - (i + 1) * volumeDecrement);
      }
      await new Promise(resolve => setTimeout(resolve, stepDuration));
    }
  }

  /**
   * Update sound enabled state.
   */
  setSoundEnabled(enabled: boolean): void {
    this.config = { ...this.config, soundEnabled: enabled };
    if (this.soundGainNode) {
      this.soundGainNode.gain.value = enabled ? this.config.soundVolume : 0;
    }
  }

  /**
   * Update music enabled state.
   */
  setMusicEnabled(enabled: boolean): void {
    this.config = { ...this.config, musicEnabled: enabled };

    if (enabled) {
      if (this.currentMusicTrackName) {
        this.playMusic(this.currentMusicTrackName, true);
      }
    } else {
      this.stopMusic();
    }
  }

  /**
   * Update sound volume.
   */
  setSoundVolume(volume: number): void {
    this.config = { ...this.config, soundVolume: Math.max(0, Math.min(1, volume)) };
    if (this.soundGainNode && this.config.soundEnabled) {
      this.soundGainNode.gain.value = this.config.soundVolume;
    }
  }

  /**
   * Update music volume.
   */
  setMusicVolume(volume: number): void {
    this.config = { ...this.config, musicVolume: Math.max(0, Math.min(1, volume)) };
    if (this.currentMusicTrack) {
      this.currentMusicTrack.volume = this.config.musicVolume;
    }
  }

  /**
   * Get current configuration.
   */
  getConfig(): Readonly<AudioManagerConfig> {
    return this.config;
  }

  /**
   * Clean up resources.
   */
  dispose(): void {
    this.stopMusic();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.soundCache.clear();
  }
}

/**
 * Global singleton instance.
 */
let globalAudioManager: AudioManager | null = null;

export function getAudioManager(): AudioManager {
  if (!globalAudioManager) {
    // Try to load settings from localStorage
    const savedSettings = localStorage.getItem('audioSettings');
    const config = savedSettings ? JSON.parse(savedSettings) : {
      soundEnabled: true,
      musicEnabled: true,
      soundVolume: 0.5,
      musicVolume: 0.3,
    };

    globalAudioManager = new AudioManager(config);
  }
  return globalAudioManager;
}

export function saveAudioSettings(config: AudioManagerConfig): void {
  localStorage.setItem('audioSettings', JSON.stringify(config));
}
