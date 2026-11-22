import { AudioManager, ConfigManager } from 'rmmz-next'

export function sound(name: string, volume = 45, pitch = 100): void {
  AudioManager.playSe({ name, volume, pitch, pan: 0 })
}
let ducked = false
export function duckMusic(duck: boolean): void {
  if (duck === ducked) return
  ducked = duck
  const current = AudioManager._currentBgm
  if (current) {
    // The content volume is attenuated; the user's volume setting stays intact.
    AudioManager.updateBufferParameters(AudioManager._bgmBuffer, ConfigManager.bgmVolume, { ...current, volume: duck ? current.volume * (25 / 65) : current.volume })
  }
}
