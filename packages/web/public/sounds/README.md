# Sound Effects Directory

This directory should contain the following sound effect files:

## Unit Sounds
- `unit_move.mp3` - Unit movement sound (short, subtle)
- `unit_attack.mp3` - Melee attack sound (clash/impact)
- `unit_ranged_attack.mp3` - Ranged attack sound (arrow/shot)
- `unit_death.mp3` - Unit destroyed sound
- `unit_select.mp3` - Unit selection sound

## City Sounds
- `city_found.mp3` - City founded fanfare
- `city_capture.mp3` - City capture sound
- `building_complete.mp3` - Building construction sound

## UI Sounds
- `click.mp3` - Button click sound
- `confirm.mp3` - Confirmation sound
- `error.mp3` - Error/warning sound

## Game Events
- `turn_start.mp3` - Turn start notification
- `turn_end.mp3` - Turn end notification
- `tech_complete.mp3` - Technology research complete
- `victory.mp3` - Victory stinger
- `defeat.mp3` - Defeat stinger

## Audio Specifications
- Format: MP3 or OGG
- Sample rate: 44.1kHz or 48kHz
- Bit rate: 128-192 kbps for MP3
- Duration: Keep sound effects short (0.5-2 seconds)
- Volume: Normalize to -3dB to -6dB

## Placeholder Implementation
Currently, the AudioManager will attempt to load these files but will handle missing files gracefully with console warnings. The game is fully functional without audio files.

## Free Audio Resources
- Freesound.org (https://freesound.org/)
- OpenGameArt.org (https://opengameart.org/)
- Zapsplat (https://www.zapsplat.com/)
- Mixkit (https://mixkit.co/)
