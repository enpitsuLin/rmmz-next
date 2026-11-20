import type { MZ } from '../../database-types'
import { Game_Actors } from '../objects/Game_Actors'
import { Game_Map } from '../objects/Game_Map'
import { Game_Message } from '../objects/Game_Message'
import { Game_Party } from '../objects/Game_Party'
import { Game_Player } from '../objects/Game_Player'
import { Game_Screen } from '../objects/Game_Screen'
import { Game_SelfSwitches } from '../objects/Game_SelfSwitches'
import { Game_Switches } from '../objects/Game_Switches'
import { Game_System } from '../objects/Game_System'
import { Game_Temp } from '../objects/Game_Temp'
import { Game_Timer } from '../objects/Game_Timer'
import { Game_Troop } from '../objects/Game_Troop'
import { Game_Variables } from '../objects/Game_Variables'
import { Graphics } from '../primitives/Graphics'
import { Utils } from '../primitives/Utils'
import { BattleManager } from './BattleManager'
import { GlobalMananger } from './GlobalManager'
import { ImageManager } from './ImageManager'
import { SceneManager } from './SceneManager'
import { StorageManager } from './StorageManager'

/**
 * The static class that manages the database and game objects.
 */
export class DataManager {
  constructor() {
    throw new Error('This is a static class')
  }

  static _setWindowData(name: GlobalMananger.GlobalStateName, value: unknown): void {
    GlobalMananger[name] = value as any
    // ;(window as unknown as Record<string, unknown>)[name] = value
  }

  static _getWindowData(name: GlobalMananger.GlobalStateName): unknown {
    return GlobalMananger[name]
  }

  static _restoreInstance<T>(instance: T, data: Record<string, any>): T {
    const inst = instance as Record<string, any>
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const value = data[key]
        if (value == null) {
          inst[key] = null
        }
        else if (Array.isArray(value)) {
          inst[key] = value.map((item) => {
            if (item == null)
              return null
            const ctor = item['@']
              ? GlobalMananger.get(item['@']) ?? Object
              : item.constructor !== Object
                ? item.constructor
                : inst[key]?.constructor || Object
            return typeof item === 'object'
              ? DataManager._restoreInstance(new ctor(), item)
              : item
          })
        }
        else if (typeof value === 'object') {
          const ctor = value['@']
            ? GlobalMananger.get(value['@']) ?? Object
            : value.constructor !== Object
              ? value.constructor
              : inst[key]?.constructor || Object
          inst[key] = DataManager._restoreInstance(new ctor(), value)
        }
        else {
          inst[key] = value
        }
      }
    }
    return instance
  }

  static _globalInfo: DataManager.SavefileInfo[] | null
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

  static loadGlobalInfo(): void {
    StorageManager.loadObject<DataManager.SavefileInfo[]>('global')
      .then((a) => {
        this._globalInfo = a
        this.removeInvalidGlobalInfo()
        return 0
      })
      .catch(() => {
        this._globalInfo = []
      })
  }

  static removeInvalidGlobalInfo(): void {
    // TODO: improve this
    const a = this._globalInfo!
    for (const e of a) {
      const t = a.indexOf(e)
      if (!this.savefileExists(t)) {
        delete a[t]
      }
    }
  }

  static saveGlobalInfo(): void {
    StorageManager.saveObject('global', this._globalInfo)
  }

  static isGlobalInfoLoaded(): boolean {
    return !!this._globalInfo
  }

  static loadDatabase(): void {
    const a = this.isBattleTest() || this.isEventTest() ? 'Test_' : ''
    for (const e of this._databaseFiles) {
      this.loadDataFile(e.name, a + e.src)
    }
    if (this.isEventTest()) {
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

  static isBattleTest(): boolean {
    return Utils.isOptionValid('btest')
  }

  static isEventTest(): boolean {
    return Utils.isOptionValid('etest')
  }

  static isTitleSkip(): boolean {
    return Utils.isOptionValid('tskip')
  }

  static isSkill(a?: MZ.GeneralItem | null): a is MZ.Skill {
    return !!a && GlobalMananger.$dataSkills.includes(a as MZ.Skill)
  }

  static isItem(a?: MZ.GeneralItem | null): a is MZ.Item {
    return !!a && GlobalMananger.$dataItems.includes(a as MZ.Item)
  }

  static isWeapon(a?: MZ.GeneralItem | null): a is MZ.Weapon {
    return !!a && GlobalMananger.$dataWeapons.includes(a as MZ.Weapon)
  }

  static isArmor(a?: MZ.GeneralItem | null): a is MZ.Armor {
    return !!a && GlobalMananger.$dataArmors.includes(a as MZ.Armor)
  }

  static createGameObjects(): void {
    GlobalMananger.$gameTemp = new Game_Temp()
    GlobalMananger.$gameSystem = new Game_System()
    GlobalMananger.$gameScreen = new Game_Screen()
    GlobalMananger.$gameTimer = new Game_Timer()
    GlobalMananger.$gameMessage = new Game_Message()
    GlobalMananger.$gameSwitches = new Game_Switches()
    GlobalMananger.$gameVariables = new Game_Variables()
    GlobalMananger.$gameSelfSwitches = new Game_SelfSwitches()
    GlobalMananger.$gameActors = new Game_Actors()
    GlobalMananger.$gameParty = new Game_Party()
    GlobalMananger.$gameTroop = new Game_Troop()
    GlobalMananger.$gameMap = new Game_Map()
    GlobalMananger.$gamePlayer = new Game_Player()
  }

  static setupNewGame(): void {
    this.createGameObjects()
    this.selectSavefileForNewGame()
    GlobalMananger.$gameParty.setupStartingMembers()
    GlobalMananger.$gamePlayer.setupForNewGame()
    Graphics.frameCount = 0
  }

  static setupBattleTest(): void {
    this.createGameObjects()
    GlobalMananger.$gameParty.setupBattleTest()
    BattleManager.setup(GlobalMananger.$dataSystem.testTroopId, true, false)
    BattleManager.setBattleTest(true)
    BattleManager.playBattleBgm()
  }

  static setupEventTest(): void {
    this.createGameObjects()
    this.selectSavefileForNewGame()
    GlobalMananger.$gameParty.setupStartingMembers()
    GlobalMananger.$gamePlayer.reserveTransfer(-1, 8, 6, 0, 0)
    GlobalMananger.$gamePlayer.setTransparent(false)
  }

  static isAnySavefileExists(): boolean {
    return this._globalInfo?.some(a => a) ?? false
  }

  static latestSavefileId(): number {
    // TODO: improve this
    const a = this._globalInfo!
    const e = a.slice(1).filter(a => a)
    const t = Math.max(...e.map(a => a.timestamp))
    const n = a.findIndex(a => a && a.timestamp === t)
    return n > 0 ? n : 0
  }

  static earliestSavefileId(): number {
    // TODO: improve this
    const a = this._globalInfo!
    const e = a.slice(1).filter(a => a)
    const t = Math.min(...e.map(a => a.timestamp))
    const n = a.findIndex(a => a && a.timestamp === t)
    return n > 0 ? n : 0
  }

  static emptySavefileId(): number {
    // TODO: improve this
    const a = this._globalInfo!
    const e = this.maxSavefiles()
    if (a.length < e) {
      return Math.max(1, a.length)
    }
    else {
      const idx = a.slice(1).findIndex(a => !a)
      return idx >= 0 ? idx + 1 : -1
    }
  }

  static loadAllSavefileImages(): void {
    // TODO: improve this
    for (const a of this._globalInfo!.filter(a => a)) {
      this.loadSavefileImages(a)
    }
  }

  static loadSavefileImages(a: DataManager.SavefileInfo): void {
    if (a.characters && Symbol.iterator in a.characters) {
      for (const e of a.characters) {
        ImageManager.loadCharacter(e[0])
      }
    }
    if (a.faces && Symbol.iterator in a.faces) {
      for (const e of a.faces) {
        ImageManager.loadFace(e[0])
      }
    }
  }

  static maxSavefiles(): number {
    return 20
  }

  static savefileInfo(a: number): DataManager.SavefileInfo | null {
    // TODO: improve this
    const e = this._globalInfo!
    return e[a] ? e[a] : null
  }

  static savefileExists(a: number): boolean {
    const e = this.makeSavename(a)
    return StorageManager.exists(e)
  }

  static saveGame(a: number): Promise<number> {
    const e = this.makeSaveContents()
    const t = this.makeSavename(a)
    return StorageManager.saveObject(t, e).then(() => {
      // TODO: improve this
      this._globalInfo![a] = this.makeSavefileInfo()
      this.saveGlobalInfo()
      return 0
    })
  }

  static loadGame(a: number): Promise<number> {
    const e = this.makeSavename(a)
    return StorageManager.loadObject<DataManager.SaveContents>(e).then((a) => {
      this.createGameObjects()
      this.extractSaveContents(a)
      this.correctDataErrors()
      return 0
    })
  }

  static makeSavename(a: number): string {
    return 'file%1'.format(a)
  }

  static selectSavefileForNewGame(): void {
    const a = this.emptySavefileId()
    const e = this.earliestSavefileId()
    if (a > 0)
      GlobalMananger.$gameSystem.setSavefileId(a)
    else
      GlobalMananger.$gameSystem.setSavefileId(e)
  }

  static makeSavefileInfo(): DataManager.SavefileInfo {
    const a = {} as DataManager.SavefileInfo
    a.title = GlobalMananger.$dataSystem.gameTitle
    a.characters = GlobalMananger.$gameParty.charactersForSavefile()
    a.faces = GlobalMananger.$gameParty.facesForSavefile()
    a.playtime = GlobalMananger.$gameSystem.playtimeText()
    a.timestamp = Date.now()
    return a
  }

  static makeSaveContents(): DataManager.SaveContents {
    const a = {} as DataManager.SaveContents
    a.system = GlobalMananger.$gameSystem
    a.screen = GlobalMananger.$gameScreen
    a.timer = GlobalMananger.$gameTimer
    a.switches = GlobalMananger.$gameSwitches
    a.variables = GlobalMananger.$gameVariables
    a.selfSwitches = GlobalMananger.$gameSelfSwitches
    a.actors = GlobalMananger.$gameActors
    a.party = GlobalMananger.$gameParty
    a.map = GlobalMananger.$gameMap
    a.player = GlobalMananger.$gamePlayer
    return a
  }

  static extractSaveContents(a: DataManager.SaveContents): void {
    try {
      GlobalMananger.$gameSystem = DataManager._restoreInstance(new Game_System(), a.system as unknown as Record<string, any>)
      GlobalMananger.$gameScreen = DataManager._restoreInstance(new Game_Screen(), a.screen as unknown as Record<string, any>)
      GlobalMananger.$gameTimer = DataManager._restoreInstance(new Game_Timer(), a.timer as unknown as Record<string, any>)
      GlobalMananger.$gameSwitches = DataManager._restoreInstance(new Game_Switches(), a.switches as unknown as Record<string, any>)
      GlobalMananger.$gameVariables = DataManager._restoreInstance(new Game_Variables(), a.variables as unknown as Record<string, any>)
      GlobalMananger.$gameSelfSwitches = DataManager._restoreInstance(new Game_SelfSwitches(), a.selfSwitches as unknown as Record<string, any>)
      GlobalMananger.$gameActors = DataManager._restoreInstance(new Game_Actors(), a.actors as unknown as Record<string, any>)
      GlobalMananger.$gameParty = DataManager._restoreInstance(new Game_Party(), a.party as unknown as Record<string, any>)
      GlobalMananger.$gameMap = DataManager._restoreInstance(new Game_Map(), a.map as unknown as Record<string, any>)
      GlobalMananger.$gamePlayer = DataManager._restoreInstance(new Game_Player(), a.player as unknown as Record<string, any>)
    }
    catch (e) {
      SceneManager.catchException(e)
      throw new Error('Cannot load savefile')
    }
  }

  static correctDataErrors(): void {
    GlobalMananger.$gameParty.removeInvalidMembers()
  }
}

export namespace DataManager {
  export interface DatabaseFileEntry {
    name: GlobalMananger.GlobalStateName
    src: string
  }
  export type DatabaseFile<T> = [null, ...T[]]

  export interface ErrorInfo {
    name: GlobalMananger.GlobalStateName
    src: string
    url: string
  }

  export interface SavefileInfo {
    title: string
    characters: [string, number][]
    faces: [string, number][]
    playtime: string
    timestamp: number
  }

  export interface SaveContents {
    system: Game_System
    screen: Game_Screen
    timer: Game_Timer
    switches: Game_Switches
    variables: Game_Variables
    selfSwitches: Game_SelfSwitches
    actors: Game_Actors
    party: Game_Party
    map: Game_Map
    player: Game_Player
  }
}
