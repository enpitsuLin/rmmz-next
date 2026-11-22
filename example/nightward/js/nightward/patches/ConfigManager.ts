import { ConfigManager, WebAudio } from 'rmmz-next'

export interface NightwardSavedConfig {
  muted?: boolean
  shake?: number
  damageNumbers?: boolean
  seenMoveHint?: boolean
}

interface NightwardConfigStatic {
  nightwardMuted: boolean
  nightwardShake: number
  nightwardDamageNumbers: boolean
  nightwardSeenMoveHint: boolean
  toggleNightwardMute: () => void
}

export const NightwardConfig = ConfigManager as typeof ConfigManager & NightwardConfigStatic

export function installConfigManagerPatch(): void {
  NightwardConfig.nightwardMuted = false
  NightwardConfig.nightwardShake = 1
  NightwardConfig.nightwardDamageNumbers = true
  NightwardConfig.nightwardSeenMoveHint = false

  NightwardConfig.toggleNightwardMute = function (): void {
    this.nightwardMuted = !this.nightwardMuted
    WebAudio.setMasterVolume(this.nightwardMuted ? 0 : 1)
    this.save()
  }

  const _makeData = ConfigManager.makeData
  ConfigManager.makeData = function () {
    return {
      ..._makeData.call(this),
      nightward: {
        muted: NightwardConfig.nightwardMuted,
        shake: NightwardConfig.nightwardShake,
        damageNumbers: NightwardConfig.nightwardDamageNumbers,
        seenMoveHint: NightwardConfig.nightwardSeenMoveHint,
      },
    }
  }

  const _applyData = ConfigManager.applyData
  ConfigManager.applyData = function (config) {
    _applyData.call(this, config)
    const saved = (config as typeof config & { nightward?: NightwardSavedConfig }).nightward
    if (saved) {
      NightwardConfig.nightwardMuted = typeof saved.muted === 'boolean' ? saved.muted : false
      NightwardConfig.nightwardShake = typeof saved.shake === 'number' ? saved.shake : 1
      NightwardConfig.nightwardDamageNumbers = typeof saved.damageNumbers === 'boolean' ? saved.damageNumbers : true
      NightwardConfig.nightwardSeenMoveHint = typeof saved.seenMoveHint === 'boolean' ? saved.seenMoveHint : false
    }
    WebAudio.setMasterVolume(NightwardConfig.nightwardMuted ? 0 : 1)
  }
}
