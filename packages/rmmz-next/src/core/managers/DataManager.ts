import type { MZ } from '../../database-types'
import { createGameObjects as createFreshGameObjects } from '../objects/createGameObjects'
import { Graphics } from '../primitives/Graphics'
import { BattleManager } from './BattleManager'
import { Database } from './Database'
import { GlobalMananger } from './GlobalManager'
import { SavefileManager } from './SavefileManager'

/**
 * The static class that loads the database files and creates the game objects.
 *
 * Savefile handling lives in {@link SavefileManager}.
 */
export class DataManager {
  constructor() {
    throw new Error('This is a static class')
  }

  static _setWindowData(name: GlobalMananger.GlobalStateName, value: unknown): void {
    GlobalMananger[name] = value as any
  }

  static _getWindowData(name: GlobalMananger.GlobalStateName): unknown {
    return GlobalMananger[name]
  }

  static _errors: DataManager.ErrorInfo[] = []
  static _databaseFiles: DataManager.DatabaseFileEntry[] = [
    { name: '$dataActors', src: 'Actors.json' },
    { name: '$dataClasses', src: 'Classes.json' },
    { name: '$dataSkills', src: 'Skills.json' },
    { name: '$dataItems', src: 'Items.json' },
    { name: '$dataWeapons', src: 'Weapons.json' },
    { name: '$dataArmors', src: 'Armors.json' },
    { name: '$dataEnemies', src: 'Enemies.json' },
    { name: '$dataTroops', src: 'Troops.json' },
    { name: '$dataStates', src: 'States.json' },
    { name: '$dataAnimations', src: 'Animations.json' },
    { name: '$dataTilesets', src: 'Tilesets.json' },
    { name: '$dataCommonEvents', src: 'CommonEvents.json' },
    { name: '$dataSystem', src: 'System.json' },
    { name: '$dataMapInfos', src: 'MapInfos.json' },
  ]

  static loadDatabase(): void {
    const a = Database.isBattleTest() || Database.isEventTest() ? 'Test_' : ''
    for (const e of this._databaseFiles) {
      this.loadDataFile(e.name, a + e.src)
    }
    if (Database.isEventTest()) {
      this.loadDataFile('$testEvent', `${a}Event.json`)
    }
  }

  static loadDataFile(name: GlobalMananger.GlobalStateName, src: string): void {
    const t = new XMLHttpRequest()
    const n = `data/${src}`
    this._setWindowData(name, null)
    t.open('GET', n)
    t.overrideMimeType('application/json')
    t.onload = () => this.onXhrLoad(t, name, src, n)
    t.onerror = () => this.onXhrError(name, src, n)
    t.send()
  }

  static onXhrLoad(t: XMLHttpRequest, name: GlobalMananger.GlobalStateName, src: string, url: string): void {
    if (t.status < 400) {
      const data = JSON.parse(t.responseText) as unknown
      this._setWindowData(name, data)
      this.onLoad(data)
    }
    else {
      this.onXhrError(name, src, url)
    }
  }

  static onXhrError(name: GlobalMananger.GlobalStateName, src: string, url: string): void {
    const n = { name, src, url }
    this._errors.push(n)
  }

  static isDatabaseLoaded(): boolean {
    this.checkError()
    for (const a of this._databaseFiles) {
      if (!this._getWindowData(a.name))
        return false
    }
    return true
  }

  static loadMapData(mapId: number): void {
    if (mapId > 0) {
      const e = 'Map%1.json'.format(mapId.padZero(3))
      this.loadDataFile('$dataMap', e)
    }
    else {
      this.makeEmptyMap()
    }
  }

  static makeEmptyMap(): void {
    GlobalMananger.$dataMap = {} as MZ.Map
    GlobalMananger.$dataMap.data = []
    GlobalMananger.$dataMap.events = []
    GlobalMananger.$dataMap.width = 100
    GlobalMananger.$dataMap.height = 100
    GlobalMananger.$dataMap.scrollType = 3
  }

  static isMapLoaded(): boolean {
    this.checkError()
    return !!GlobalMananger.$dataMap
  }

  static onLoad(data: unknown): void {
    if (this.isMapObject(data)) {
      this.extractMetadata(data)
      this.extractArrayMetadata(data.events)
    }
    else {
      this.extractArrayMetadata(data)
    }
  }

  static isMapObject(data: unknown): data is MZ.Map {
    return !!data && typeof data === 'object' && 'data' in data && 'events' in data
  }

  static extractArrayMetadata(data: unknown): void {
    if (Array.isArray(data)) {
      for (const e of data) {
        if (e && typeof e === 'object' && 'note' in e) {
          this.extractMetadata(e as { note: string, meta?: Record<string, string | boolean> })
        }
      }
    }
  }

  static extractMetadata(a: { note: string, meta?: Record<string, string | boolean> }): void {
    // TODO fix this
    // eslint-disable-next-line regexp/no-super-linear-backtracking
    const e = /<([^<>:]+)(:?)([^>]*)>/g
    a.meta = {}
    for (; ;) {
      const t = e.exec(a.note)
      if (!t)
        break
      if (t[2] === ':') {
        a.meta[t[1]] = t[3]
      }
      else {
        a.meta[t[1]] = true
      }
    }
  }

  static checkError(): void {
    if (this._errors.length > 0) {
      // TODO: improve this
      const a = this._errors.shift()!
      const e = (): void => {
        this.loadDataFile(a.name, a.src)
      }
      // TODO fix this
      // eslint-disable-next-line no-throw-literal
      throw ['LoadError', a.url, e]
    }
  }

  static setupNewGame(): void {
    createFreshGameObjects()
    SavefileManager.selectSavefileForNewGame()
    GlobalMananger.$gameParty.setupStartingMembers()
    GlobalMananger.$gamePlayer.setupForNewGame()
    Graphics.frameCount = 0
  }

  static setupBattleTest(): void {
    createFreshGameObjects()
    GlobalMananger.$gameParty.setupBattleTest()
    BattleManager.setup(GlobalMananger.$dataSystem.testTroopId, true, false)
    BattleManager.setBattleTest(true)
    BattleManager.playBattleBgm()
  }

  static setupEventTest(): void {
    createFreshGameObjects()
    SavefileManager.selectSavefileForNewGame()
    GlobalMananger.$gameParty.setupStartingMembers()
    GlobalMananger.$gamePlayer.reserveTransfer(-1, 8, 6, 0, 0)
    GlobalMananger.$gamePlayer.setTransparent(false)
  }

  // --- RMMZ plugin surface -------------------------------------------------
  // Plugins call these on DataManager. The implementations live in `Database`
  // (read-only database and launch queries) and `SavefileManager` (savefile
  // IO); forwarding keeps the original call sites working without pulling
  // either module back into the object graph.

  static get _globalInfo(): SavefileManager.SavefileInfo[] | null {
    return SavefileManager._globalInfo
  }

  static set _globalInfo(value: SavefileManager.SavefileInfo[] | null) {
    SavefileManager._globalInfo = value
  }

  static isBattleTest(): boolean {
    return Database.isBattleTest()
  }

  static isEventTest(): boolean {
    return Database.isEventTest()
  }

  static isTitleSkip(): boolean {
    return Database.isTitleSkip()
  }

  static isSkill(item?: MZ.GeneralItem | null): item is MZ.Skill {
    return Database.isSkill(item)
  }

  static isItem(item?: MZ.GeneralItem | null): item is MZ.Item {
    return Database.isItem(item)
  }

  static isWeapon(item?: MZ.GeneralItem | null): item is MZ.Weapon {
    return Database.isWeapon(item)
  }

  static isArmor(item?: MZ.GeneralItem | null): item is MZ.Armor {
    return Database.isArmor(item)
  }

  static createGameObjects(): void {
    createFreshGameObjects()
  }

  static _restoreInstance<T>(instance: T, data: Record<string, any>): T {
    return SavefileManager._restoreInstance(instance, data)
  }

  static loadGlobalInfo(): void {
    SavefileManager.loadGlobalInfo()
  }

  static removeInvalidGlobalInfo(): void {
    SavefileManager.removeInvalidGlobalInfo()
  }

  static saveGlobalInfo(): void {
    SavefileManager.saveGlobalInfo()
  }

  static isGlobalInfoLoaded(): boolean {
    return SavefileManager.isGlobalInfoLoaded()
  }

  static isAnySavefileExists(): boolean {
    return SavefileManager.isAnySavefileExists()
  }

  static latestSavefileId(): number {
    return SavefileManager.latestSavefileId()
  }

  static earliestSavefileId(): number {
    return SavefileManager.earliestSavefileId()
  }

  static emptySavefileId(): number {
    return SavefileManager.emptySavefileId()
  }

  static loadAllSavefileImages(): void {
    SavefileManager.loadAllSavefileImages()
  }

  static loadSavefileImages(a: DataManager.SavefileInfo): void {
    SavefileManager.loadSavefileImages(a)
  }

  static maxSavefiles(): number {
    return SavefileManager.maxSavefiles()
  }

  static savefileInfo(a: number): DataManager.SavefileInfo | null {
    return SavefileManager.savefileInfo(a)
  }

  static savefileExists(a: number): boolean {
    return SavefileManager.savefileExists(a)
  }

  static saveGame(a: number): Promise<number> {
    return SavefileManager.saveGame(a)
  }

  static loadGame(a: number): Promise<number> {
    return SavefileManager.loadGame(a)
  }

  static makeSavename(a: number): string {
    return SavefileManager.makeSavename(a)
  }

  static selectSavefileForNewGame(): void {
    SavefileManager.selectSavefileForNewGame()
  }

  static makeSavefileInfo(): DataManager.SavefileInfo {
    return SavefileManager.makeSavefileInfo()
  }

  static makeSaveContents(): DataManager.SaveContents {
    return SavefileManager.makeSaveContents()
  }

  /**
   * Replaces the game objects with the given save contents, discarding the
   * current ones. `SavefileManager.restoreSaveContents` fills the current
   * instances instead, which is what `loadGame` uses.
   */
  static extractSaveContents(a: DataManager.SaveContents): void {
    createFreshGameObjects()
    SavefileManager.restoreSaveContents(a)
  }

  static correctDataErrors(): void {
    SavefileManager.correctDataErrors()
  }
}

export namespace DataManager {
  export interface DatabaseFileEntry {
    name: GlobalMananger.GlobalStateName
    src: string
  }

  export interface ErrorInfo {
    name: GlobalMananger.GlobalStateName
    src: string
    url: string
  }

  export type DatabaseFile<T> = Database.DatabaseFile<T>
  export type SavefileInfo = SavefileManager.SavefileInfo
  export type SaveContents = SavefileManager.SaveContents
}
