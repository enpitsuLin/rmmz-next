import { ConfigManager, WebAudio } from 'rmmz-next'

export const settings = { muted: false, shake: 1, damageNumbers: true, seenMoveHint: false }
export const shakeGain = (): number => settings.shake
export function installConfig(): void {
  const makeData = ConfigManager.makeData
  ConfigManager.makeData = function () {
    return { ...makeData.call(this), nightward: { ...settings } }
  }
  const applyData = ConfigManager.applyData
  ConfigManager.applyData = function (config) {
    applyData.call(this, config)
    const saved = config as typeof config & { nightward?: typeof settings }
    Object.assign(settings, saved.nightward)
    WebAudio.setMasterVolume(settings.muted ? 0 : 1)
  }
}
export function toggleMute(): void {
  settings.muted = !settings.muted
  WebAudio.setMasterVolume(settings.muted ? 0 : 1)
  ConfigManager.save()
}
