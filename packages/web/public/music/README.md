# Background Music Directory

This directory should contain the following background music tracks:

## Age-Themed Tracks
- `antiquity.mp3` - Ancient age music (peaceful, ambient)
- `exploration.mp3` - Exploration age music (adventurous, nautical)
- `modern.mp3` - Modern age music (industrial, triumphant)

## Mood Tracks
- `peace.mp3` - Peaceful background music
- `war.mp3` - Tension/war background music

## Audio Specifications
- Format: MP3 or OGG
- Sample rate: 44.1kHz or 48kHz
- Bit rate: 128-192 kbps for MP3
- Duration: 2-5 minutes per track (loopable)
- Volume: Normalize to -12dB to -18dB (quieter than SFX)
- Loop points: Ensure smooth transitions for looping

## Music Behavior
- Music fades in over 2-3 seconds when starting
- Music fades out over 1.5-2 seconds when changing tracks
- War music overrides age-themed music during active conflicts
- Peace music plays when not at war

## Placeholder Implementation
Currently, the AudioManager will attempt to load these files but will handle missing files gracefully with console warnings. The game is fully functional without music files.

## Free Music Resources
- Incompetech (https://incompetech.com/)
- FreePD (https://freepd.com/)
- Purple Planet (https://purple-planet.com/)
- BenSound (https://www.bensound.com/)
- ccMixter (https://ccmixter.com/)