import type { Game_Actors } from '../objects/Game_Actors'
import type { Game_Map } from '../objects/Game_Map'
import type { Game_Party } from '../objects/Game_Party'
import type { Game_Player } from '../objects/Game_Player'
import type { Game_Screen } from '../objects/Game_Screen'
import type { Game_SelfSwitches } from '../objects/Game_SelfSwitches'
import type { Game_Switches } from '../objects/Game_Switches'
import type { Game_System } from '../objects/Game_System'
import type { Game_Timer } from '../objects/Game_Timer'
import type { Game_Variables } from '../objects/Game_Variables'
import { createGameObjects } from '../objects/createGameObjects'
import { ClassRegistry } from './ClassRegistry'
import { GlobalMananger } from './GlobalManager'
import { ImageManager } from './ImageManager'
import { SceneManager } from './SceneManager'
import { StorageManager } from './StorageManager'

/**
 * The static class that saves and loads the game state.
 *
 * Database loading and game object creation stay in `DataManager`; everything
 * that reads or writes a savefile is here.
 */
export class SavefileManager {
  constructor() {
    throw new Error('This is a static class')
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
              ? ClassRegistry.get(item['@']) ?? Object
              : item.constructor !== Object
                ? item.constructor
                : inst[key]?.constructor || Object
            return typeof item === 'object'
              ? SavefileManager._restoreInstance(new ctor(), item)
              : item
          })
        }
        else if (typeof value === 'object') {
          const ctor = value['@']
            ? ClassRegistry.get(value['@']) ?? Object
            : value.constructor !== Object
              ? value.constructor
              : inst[key]?.constructor || Object
          inst[key] = SavefileManager._restoreInstance(new ctor(), value)
        }
        else {
          inst[key] = value
        }
      }
    }
    return instance
  }

  static _globalInfo: SavefileManager.SavefileInfo[] | null = null

  static loadGlobalInfo(): void {
    StorageManager.loadObject<SavefileManager.SavefileInfo[]>('global')
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

  static loadSavefileImages(a: SavefileManager.SavefileInfo): void {
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

  static savefileInfo(a: number): SavefileManager.SavefileInfo | null {
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
    return StorageManager.loadObject<SavefileManager.SaveContents>(e).then((a) => {
      createGameObjects()
      this.restoreSaveContents(a)
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

  static makeSavefileInfo(): SavefileManager.SavefileInfo {
    const a = {} as SavefileManager.SavefileInfo
    a.title = GlobalMananger.$dataSystem.gameTitle
    a.characters = GlobalMananger.$gameParty.charactersForSavefile()
    a.faces = GlobalMananger.$gameParty.facesForSavefile()
    a.playtime = GlobalMananger.$gameSystem.playtimeText()
    a.timestamp = Date.now()
    return a
  }

  static makeSaveContents(): SavefileManager.SaveContents {
    const a = {} as SavefileManager.SaveContents
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

  /**
   * Fills the save data into the game objects that `createGameObjects()` just
   * built, instead of constructing a second set of instances.
   */
  static restoreSaveContents(a: SavefileManager.SaveContents): void {
    try {
      SavefileManager._restoreInstance(GlobalMananger.$gameSystem, a.system as unknown as Record<string, any>)
      SavefileManager._restoreInstance(GlobalMananger.$gameScreen, a.screen as unknown as Record<string, any>)
      SavefileManager._restoreInstance(GlobalMananger.$gameTimer, a.timer as unknown as Record<string, any>)
      SavefileManager._restoreInstance(GlobalMananger.$gameSwitches, a.switches as unknown as Record<string, any>)
      SavefileManager._restoreInstance(GlobalMananger.$gameVariables, a.variables as unknown as Record<string, any>)
      SavefileManager._restoreInstance(GlobalMananger.$gameSelfSwitches, a.selfSwitches as unknown as Record<string, any>)
      SavefileManager._restoreInstance(GlobalMananger.$gameActors, a.actors as unknown as Record<string, any>)
      SavefileManager._restoreInstance(GlobalMananger.$gameParty, a.party as unknown as Record<string, any>)
      SavefileManager._restoreInstance(GlobalMananger.$gameMap, a.map as unknown as Record<string, any>)
      SavefileManager._restoreInstance(GlobalMananger.$gamePlayer, a.player as unknown as Record<string, any>)
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

export namespace SavefileManager {
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
