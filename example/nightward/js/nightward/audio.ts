import { AudioManager, ConfigManager, GlobalMananger as globals, WebAudio } from 'rmmz-next'

export const settings = { muted: false, shake: 1, damageNumbers: true, seenMoveHint: false }
export const shakeGain = (): number => settings.shake
export function installConfig(): void {
  const makeData = ConfigManager.makeData
  ConfigManager.makeData = function () { return { ...makeData.call(this), nightward: { ...settings } } }
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
export function playMusic(eventId: number): void {
  const event = globals.$dataCommonEvents[eventId]!
  const command = event.list.find(command => command.code === 241)!
  AudioManager.playBgm(command.parameters[0] as { name: string, volume: number, pitch: number, pan: number })
}
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
    AudioManager.updateBufferParameters(AudioManager._bgmBuffer, ConfigManager.bgmVolume, { ...current, volume: duck ? 25 : 65 })
  }
}
