import { useState, useEffect, useCallback, useRef } from 'react';
import { AudioManager, getAudioManager, saveAudioSettings, SoundEffect, MusicTrack, AudioManagerConfig } from '../audio/AudioManager';

export interface UseAudioReturn {
  readonly isInitialized: boolean;
  readonly soundEnabled: boolean;
  readonly musicEnabled: boolean;
  readonly soundVolume: number;
  readonly musicVolume: number;
  initialize: () => Promise<void>;
  playSound: (effect: SoundEffect, volume?: number) => Promise<void>;
  playMusic: (track: MusicTrack, immediate?: boolean) => Promise<void>;
  stopMusic: () => Promise<void>;
  toggleSound: () => void;
  toggleMusic: () => void;
  setSoundVolume: (volume: number) => void;
  setMusicVolume: (volume: number) => void;
}

export function useAudio(): UseAudioReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [config, setConfig] = useState<AudioManagerConfig>(() => {
    const manager = getAudioManager();
    return manager.getConfig();
  });

  const managerRef = useRef<AudioManager>(getAudioManager());

  useEffect(() => {
    const manager = managerRef.current;

    // Update config when manager changes
    const updateConfig = () => {
      setConfig({ ...manager.getConfig() });
    };

    // Initialize audio on first user interaction
    const handleUserInteraction = async () => {
      if (!isInitialized) {
        await manager.initialize();
        setIsInitialized(true);
      }
    };

    // Listen for user interaction to initialize audio
    document.addEventListener('click', handleUserInteraction, { once: true });
    document.addEventListener('keydown', handleUserInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [isInitialized]);

  const initialize = useCallback(async () => {
    const manager = managerRef.current;
    await manager.initialize();
    setIsInitialized(true);
  }, []);

  const playSound = useCallback(async (effect: SoundEffect, volume?: number) => {
    const manager = managerRef.current;
    await manager.playSound(effect, volume);
  }, []);

  const playMusic = useCallback(async (track: MusicTrack, immediate?: boolean) => {
    const manager = managerRef.current;
    await manager.playMusic(track, immediate);
  }, []);

  const stopMusic = useCallback(async () => {
    const manager = managerRef.current;
    await manager.stopMusic();
  }, []);

  const toggleSound = useCallback(() => {
    const manager = managerRef.current;
    const newConfig = { ...manager.getConfig(), soundEnabled: !manager.getConfig().soundEnabled };
    manager.setSoundEnabled(newConfig.soundEnabled);
    setConfig(newConfig);
    saveAudioSettings(newConfig);
  }, []);

  const toggleMusic = useCallback(() => {
    const manager = managerRef.current;
    const newConfig = { ...manager.getConfig(), musicEnabled: !manager.getConfig().musicEnabled };
    manager.setMusicEnabled(newConfig.musicEnabled);
    setConfig(newConfig);
    saveAudioSettings(newConfig);
  }, []);

  const setSoundVolume = useCallback((volume: number) => {
    const manager = managerRef.current;
    manager.setSoundVolume(volume);
    const newConfig = { ...manager.getConfig(), soundVolume: volume };
    setConfig(newConfig);
    saveAudioSettings(newConfig);
  }, []);

  const setMusicVolume = useCallback((volume: number) => {
    const manager = managerRef.current;
    manager.setMusicVolume(volume);
    const newConfig = { ...manager.getConfig(), musicVolume: volume };
    setConfig(newConfig);
    saveAudioSettings(newConfig);
  }, []);

  return {
    isInitialized,
    soundEnabled: config.soundEnabled,
    musicEnabled: config.musicEnabled,
    soundVolume: config.soundVolume,
    musicVolume: config.musicVolume,
    initialize,
    playSound,
    playMusic,
    stopMusic,
    toggleSound,
    toggleMusic,
    setSoundVolume,
    setMusicVolume,
  };
}
