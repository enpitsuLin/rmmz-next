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
import type { Database } from './Database'
import { ClassRegistry } from './ClassRegistry'

/**
 * Brand new manager to manager replace original RMMZ global state and Game Object class resolve
 */
export class GlobalMananger {
  protected static initialized = false

  static $dataActors: Database.DatabaseFile<MZ.Actor>
  static $dataClasses: Database.DatabaseFile<MZ.Class>
  static $dataSkills: Database.DatabaseFile<MZ.Skill>
  static $dataItems: Database.DatabaseFile<MZ.Item>
  static $dataWeapons: Database.DatabaseFile<MZ.Weapon>
  static $dataArmors: Database.DatabaseFile<MZ.Armor>
  static $dataEnemies: Database.DatabaseFile<MZ.Enemy>
  static $dataTroops: Database.DatabaseFile<MZ.Troop>
  static $dataStates: Database.DatabaseFile<MZ.State>
  static $dataAnimations: Database.DatabaseFile<MZ.Animation>
  static $dataTilesets: Database.DatabaseFile<MZ.Tileset>
  static $dataCommonEvents: Database.DatabaseFile<MZ.CommonEvent>
  static $dataSystem: MZ.System
  static $dataMapInfos: Database.DatabaseFile<MZ.MapInfo>
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
  static init(constructors: ClassRegistry.AnyConstructor[]): void {
    constructors.forEach((ctor) => {
      ClassRegistry.register(ctor as ClassRegistry.Constructor)
    })
    this.initialized = true
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
