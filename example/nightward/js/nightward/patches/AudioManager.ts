import type { RunEvent } from '../objects/Game_NightwardRun'
import { AudioManager, ConfigManager, SoundManager } from 'rmmz-next'
import { NightwardDataManager } from '../managers/NightwardDataManager'

interface NightwardAudioStatic {
  _nightwardBgmDucked: boolean
  setBgmDuck: (duck: boolean) => void
}

interface NightwardSoundStatic {
  playNightwardSe: (name: string, volume?: number, pitch?: number) => void
  playNightwardRunEvents: (events: readonly RunEvent[]) => void
}

export const NightwardAudio = AudioManager as typeof AudioManager & NightwardAudioStatic
export const NightwardSound = SoundManager as typeof SoundManager & NightwardSoundStatic

export function installAudioManagerPatch(): void {
  NightwardAudio._nightwardBgmDucked = false

  NightwardAudio.setBgmDuck = function (duck: boolean): void {
    if (duck === this._nightwardBgmDucked)
      return
    this._nightwardBgmDucked = duck
    const current = this._currentBgm
    if (current) {
      // Attenuate content volume while leaving the user's bgmVolume setting intact.
      this.updateBufferParameters(this._bgmBuffer, ConfigManager.bgmVolume, {
        ...current,
        volume: duck ? current.volume * (25 / 65) : current.volume,
      })
    }
  }

  NightwardSound.playNightwardSe = function (name: string, volume = 45, pitch = 100): void {
    AudioManager.playSe({ name, volume, pitch, pan: 0 })
  }

  NightwardSound.playNightwardRunEvents = function (events: readonly RunEvent[]): void {
    if (!events.length)
      return
    const kinds = new Set(events.map(event => event.kind))
    const se = NightwardDataManager.config().sounds
    if (kinds.has('lash'))
      this.playNightwardSe(se.lash, 25)
    if (kinds.has('wand'))
      this.playNightwardSe(se.wand, 22)
    if (kinds.has('tomes'))
      this.playNightwardSe(se.tomes, 25)
    if (kinds.has('ward'))
      this.playNightwardSe(se.ward, 20)
    if (kinds.has('hurt'))
      SoundManager.playActorDamage()
    else if (kinds.has('lightning'))
      this.playNightwardSe(se.lightning, 30)
    else if (kinds.has('hit'))
      SoundManager.playEnemyDamage()
    if (kinds.has('pickup'))
      SoundManager.playUseItem()
    if (kinds.has('relic'))
      this.playNightwardSe(se.relic, 70)
    if (kinds.has('flask'))
      this.playNightwardSe(se.flask, 23)
  }
}
