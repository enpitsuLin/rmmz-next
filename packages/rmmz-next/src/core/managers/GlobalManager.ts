import type { MZ } from '../../database-types'
import type { Game_Actors } from '../objects/Game_Actors'
import type { Game_Map } from '../objects/Game_Map'
import type { Game_Message } from '../objects/Game_Message'
import type { Game_Party } from '../objects/Game_Party'
import type { Game_Player } from '../objects/Game_Player'
import type { Game_Screen } from '../objects/Game_Screen'
import type { Game_SelfSwitches } from '../objects/Game_SelfSwitches'
import type { Game_Switches } from '../objects/Game_Switches'
import type { Game_System } from '../objects/Game_System'
import type { Game_Temp } from '../objects/Game_Temp'
import type { Game_Timer } from '../objects/Game_Timer'
import type { Game_Troop } from '../objects/Game_Troop'
import type { Game_Variables } from '../objects/Game_Variables'
import type { DataManager } from './DataManager'

type AnyConstructor = abstract new (...args: any[]) => any
type Constructor = new (...args: any[]) => any

/**
 * Brand new manager to manager replace original RMMZ global state and Game Object class resolve
 */
export class GlobalMananger {
  protected static initialized = false

  static $dataActors: DataManager.DatabaseFile<MZ.Actor>
  static $dataClasses: DataManager.DatabaseFile<MZ.Class>
  static $dataSkills: DataManager.DatabaseFile<MZ.Skill>
  static $dataItems: DataManager.DatabaseFile<MZ.Item>
  static $dataWeapons: DataManager.DatabaseFile<MZ.Weapon>
  static $dataArmors: DataManager.DatabaseFile<MZ.Armor>
  static $dataEnemies: DataManager.DatabaseFile<MZ.Enemy>
  static $dataTroops: DataManager.DatabaseFile<MZ.Troop>
  static $dataStates: DataManager.DatabaseFile<MZ.State>
  static $dataAnimations: DataManager.DatabaseFile<MZ.Animation>
  static $dataTilesets: DataManager.DatabaseFile<MZ.Tileset>
  static $dataCommonEvents: DataManager.DatabaseFile<MZ.CommonEvent>
  static $dataSystem: MZ.System
  static $dataMapInfos: DataManager.DatabaseFile<MZ.MapInfo>
  static $dataMap: MZ.Map

  static $gameTemp: Game_Temp
  static $gameSystem: Game_System
  static $gameScreen: Game_Screen
  static $gameTimer: Game_Timer
  static $gameMessage: Game_Message
  static $gameSwitches: Game_Switches
  static $gameVariables: Game_Variables
  static $gameSelfSwitches: Game_SelfSwitches
  static $gameActors: Game_Actors
  static $gameParty: Game_Party
  static $gameTroop: Game_Troop
  static $gameMap: Game_Map
  static $gamePlayer: Game_Player
  static $testEvent: MZ.EventCommon.PageCommand[] | null = null

  static registry = new Map<string, new (...args: any[]) => any>()

  private constructor() {}

  static isReady(): boolean {
    return this.initialized
  }

  /**
   * Registers every game object class used by save data.
   *
   * The host injects the constructors instead of this manager importing the
   * `objects` barrel: the manager sits inside the `managers` <-> `objects`
   * cycle, and materializing that barrel's namespace during evaluation throws a
   * TDZ error in production bundles.
   */
  static init(constructors: AnyConstructor[]): void {
    constructors.forEach((ctor) => {
      this.register(ctor as Constructor)
    })
    this.initialized = true
  }

  /**
   * Register a class constructor for ESM-compatible serialization/deserialization.
   * Replaces the original eval()/window[] lookup used in RMMZ.
   */
  static register(constructor: Constructor): void {
    if (!constructor.name) {
      throw new TypeError('Constructor has no properly name')
    }
    this.registry.set(constructor.name, constructor)
  }

  /**
   * Retrieve a registered class constructor by name.
   */
  static get<T extends Constructor>(name: string): T | undefined {
    return this.registry.get(name) as T | undefined
  }
}

export namespace GlobalMananger {

  export type GlobalStateName
    = | '$dataActors'
      | '$dataClasses'
      | '$dataSkills'
      | '$dataItems'
      | '$dataWeapons'
      | '$dataArmors'
      | '$dataEnemies'
      | '$dataTroops'
      | '$dataStates'
      | '$dataAnimations'
      | '$dataTilesets'
      | '$dataCommonEvents'
      | '$dataSystem'
      | '$dataMapInfos'
      | '$dataMap'
      | '$gameTemp'
      | '$gameSystem'
      | '$gameScreen'
      | '$gameTimer'
      | '$gameMessage'
      | '$gameSwitches'
      | '$gameVariables'
      | '$gameSelfSwitches'
      | '$gameActors'
      | '$gameParty'
      | '$gameTroop'
      | '$gameMap'
      | '$gamePlayer'
      | '$testEvent'
}
