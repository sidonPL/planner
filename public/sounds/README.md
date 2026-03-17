# Sound Files for Gamification

This folder contains sound effects for the gamification system.

## Files Needed:

1. **task-complete.mp3** - Gentle bell/ding sound (~0.3s)
2. **achievement.mp3** - Victory fanfare (~1-2s)
3. **level-up.mp3** - Epic level up sound (~2s)
4. **xp.mp3** - Subtle coin/ping (~0.2s)
5. **quest.mp3** - Quest complete chime (~0.5s)
6. **streak.mp3** - Fire whoosh (~0.4s)
7. **confetti.mp3** - Pop/burst sound (~0.3s)

## Where to Find Free Sounds:

- [Freesound.org](https://freesound.org) - Requires attribution
- [Mixkit.co](https://mixkit.co/free-sound-effects/) - Free license
- [Zapsplat.com](https://www.zapsplat.com) - Free with account

## Temporary Solution:

For development, you can use silent mp3 files or disable sounds in localStorage:
```javascript
localStorage.setItem('gamification-sound-enabled', 'false');
```

## Adding Sound Files:

1. Download/create sound files
2. Place them in this folder
3. Ensure filenames match exactly:
   - task-complete.mp3
   - achievement.mp3
   - level-up.mp3
   - xp.mp3
   - quest.mp3
   - streak.mp3
   - confetti.mp3

## License:

Make sure to check licenses and add attribution if required!

