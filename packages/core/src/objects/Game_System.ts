import type { MZ } from '@rmmz-lib/database-types'
import type { RGBA } from '../types'
import { Graphics } from '../core'
import { AudioManager } from '../managers/AudioManager'

/**
 * The game object class for the system data.
 */
export class Game_System {
  _saveEnabled: boolean
  _menuEnabled: boolean
  _encounterEnabled: boolean
  _formationEnabled: boolean
  _battleCount: number
  _winCount: number
  _escapeCount: number
  _saveCount: number
  _versionId: number
  _savefileId: number
  _framesOnSave: number
  _bgmOnSave: MZ.AudioInfo | null
  _bgsOnSave: MZ.AudioInfo | null
  _windowTone: RGBA | null
  _battleBgm: MZ.AudioInfo | null
  _victoryMe: MZ.AudioInfo | null
  _defeatMe: MZ.AudioInfo | null
  _savedBgm: MZ.AudioInfo | null
  _walkingBgm: MZ.AudioInfo | null

  constructor() {
    this._saveEnabled = true
    this._menuEnabled = true
    this._encounterEnabled = true
    this._formationEnabled = true
    this._battleCount = 0
    this._winCount = 0
    this._escapeCount = 0
    this._saveCount = 0
    this._versionId = 0
    this._savefileId = 0
    this._framesOnSave = 0
    this._bgmOnSave = null
    this._bgsOnSave = null
    this._windowTone = null
    this._battleBgm = null
    this._victoryMe = null
    this._defeatMe = null
    this._savedBgm = null
    this._walkingBgm = null
  }

  isJapanese(): boolean {
    return !!$dataSystem.locale.match(/^ja/)
  }

  isChinese(): boolean {
    return !!$dataSystem.locale.match(/^zh/)
  }

  isKorean(): boolean {
    return !!$dataSystem.locale.match(/^ko/)
  }

  isCJK(): boolean {
    return !!$dataSystem.locale.match(/^(ja|zh|ko)/)
  }

  isRussian(): boolean {
    return !!$dataSystem.locale.match(/^ru/)
  }

  isSideView(): boolean {
    return $dataSystem.optSideView
  }

  isAutosaveEnabled(): boolean {
    return $dataSystem.optAutosave
  }

  isMessageSkipEnabled(): boolean {
    return $dataSystem.optMessageSkip
  }

  isSaveEnabled(): boolean {
    return this._saveEnabled
  }

  disableSave(): void {
    this._saveEnabled = false
  }

  enableSave(): void {
    this._saveEnabled = true
  }

  isMenuEnabled(): boolean {
    return this._menuEnabled
  }

  disableMenu(): void {
    this._menuEnabled = false
  }

  enableMenu(): void {
    this._menuEnabled = true
  }

  isEncounterEnabled(): boolean {
    return this._encounterEnabled
  }

  disableEncounter(): void {
    this._encounterEnabled = false
  }

  enableEncounter(): void {
    this._encounterEnabled = true
  }

  isFormationEnabled(): boolean {
    return this._formationEnabled
  }

  disableFormation(): void {
    this._formationEnabled = false
  }

  enableFormation(): void {
    this._formationEnabled = true
  }

  battleCount(): number {
    return this._battleCount
  }

  winCount(): number {
    return this._winCount
  }

  escapeCount(): number {
    return this._escapeCount
  }

  saveCount(): number {
    return this._saveCount
  }

  versionId(): number {
    return this._versionId
  }

  savefileId(): number {
    return this._savefileId || 0
  }

  setSavefileId(savefileId: number): void {
    this._savefileId = savefileId
  }

  windowTone(): RGBA {
    return this._windowTone || $dataSystem.windowTone
  }

  setWindowTone(value: RGBA | null): void {
    this._windowTone = value
  }

  battleBgm(): MZ.AudioInfo | null {
    return this._battleBgm || $dataSystem.battleBgm
  }

  setBattleBgm(value: MZ.AudioInfo | null): void {
    this._battleBgm = value
  }

  victoryMe(): MZ.AudioInfo | null {
    return this._victoryMe || $dataSystem.victoryMe
  }

  setVictoryMe(value: MZ.AudioInfo | null): void {
    this._victoryMe = value
  }

  defeatMe(): MZ.AudioInfo {
    return this._defeatMe || $dataSystem.defeatMe
  }

  setDefeatMe(value: MZ.AudioInfo | null): void {
    this._defeatMe = value
  }

  onBattleStart(): void {
    this._battleCount++
  }

  onBattleWin(): void {
    this._winCount++
  }

  onBattleEscape(): void {
    this._escapeCount++
  }

  onBeforeSave(): void {
    this._saveCount++
    this._versionId = $dataSystem.versionId
    this._framesOnSave = Graphics.frameCount
    this._bgmOnSave = AudioManager.saveBgm()
    this._bgsOnSave = AudioManager.saveBgs()
  }

  onAfterLoad(): void {
    Graphics.frameCount = this._framesOnSave
    AudioManager.playBgm(this._bgmOnSave)
    AudioManager.playBgs(this._bgsOnSave)
  }

  playtime(): number {
    return Math.floor(Graphics.frameCount / 60)
  }

  playtimeText(): string {
    const hour = Math.floor(this.playtime() / 3600)
    const min = Math.floor(this.playtime() / 60) % 60
    const sec = this.playtime() % 60
    return `${hour.padZero(2)}:${min.padZero(2)}:${sec.padZero(2)}`
  }

  saveBgm(): void {
    this._savedBgm = AudioManager.saveBgm()
  }

  replayBgm(): void {
    if (this._savedBgm) {
      AudioManager.replayBgm(this._savedBgm)
    }
  }

  saveWalkingBgm(): void {
    this._walkingBgm = AudioManager.saveBgm()
  }

  replayWalkingBgm(): void {
    if (this._walkingBgm) {
      AudioManager.playBgm(this._walkingBgm)
    }
  }

  saveWalkingBgm2(): void {
    this._walkingBgm = $dataMap.bgm
  }

  mainFontFace(): string {
    return `rmmz-mainfont, ${$dataSystem.advanced.fallbackFonts}`
  }

  numberFontFace(): string {
    return `rmmz-numberfont, ${this.mainFontFace()}`
  }

  mainFontSize(): number {
    return $dataSystem.advanced.fontSize
  }

  windowPadding(): number {
    return 12
  }

  windowOpacity(): number {
    return $dataSystem.advanced.windowOpacity
  }
}
