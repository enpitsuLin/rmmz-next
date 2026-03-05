/* eslint-disable vars-on-top */
import type { MZ } from '@rmmz-lib/database-types'

import type {
  DataManager,
  Game_Actors,
  Game_Map,
  Game_Message,
  Game_Party,
  Game_Player,
  Game_Screen,
  Game_SelfSwitches,
  Game_Switches,
  Game_System,
  Game_Temp,
  Game_Timer,
  Game_Troop,
  Game_Variables,
  PluginManager,
} from '.'

declare global {
  interface Window {
    $dataActors: DataManager.DatabaseFile<MZ.Actor>
    $dataClasses: DataManager.DatabaseFile<MZ.Class>
    $dataSkills: DataManager.DatabaseFile<MZ.Skill>
    $dataItems: DataManager.DatabaseFile<MZ.Item>
    $dataWeapons: DataManager.DatabaseFile<MZ.Weapon>
    $dataArmors: DataManager.DatabaseFile<MZ.Armor>
    $dataEnemies: DataManager.DatabaseFile<MZ.Enemy>
    $dataTroops: DataManager.DatabaseFile<MZ.Troop>
    $dataStates: DataManager.DatabaseFile<MZ.State>
    $dataAnimations: DataManager.DatabaseFile<MZ.Animation>
    $dataTilesets: DataManager.DatabaseFile<MZ.Tileset>
    $dataCommonEvents: DataManager.DatabaseFile<MZ.CommonEvent>
    $dataSystem: MZ.System
    $dataMapInfos: DataManager.DatabaseFile<MZ.MapInfo>
    $dataMap: MZ.Map

    $gameTemp: Game_Temp
    $gameSystem: Game_System
    $gameScreen: Game_Screen
    $gameTimer: Game_Timer
    $gameMessage: Game_Message
    $gameSwitches: Game_Switches
    $gameVariables: Game_Variables
    $gameSelfSwitches: Game_SelfSwitches
    $gameActors: Game_Actors
    $gameParty: Game_Party
    $gameTroop: Game_Troop
    $gameMap: Game_Map
    $gamePlayer: Game_Player

    $testEvent: any
  }
  var $dataActors: DataManager.DatabaseFile<MZ.Actor>
  var $dataClasses: DataManager.DatabaseFile<MZ.Class>
  var $dataSkills: DataManager.DatabaseFile<MZ.Skill>
  var $dataItems: DataManager.DatabaseFile<MZ.Item>
  var $dataWeapons: DataManager.DatabaseFile<MZ.Weapon>
  var $dataArmors: DataManager.DatabaseFile<MZ.Armor>
  var $dataEnemies: DataManager.DatabaseFile<MZ.Enemy>
  var $dataTroops: DataManager.DatabaseFile<MZ.Troop>
  var $dataStates: DataManager.DatabaseFile<MZ.State>
  var $dataAnimations: DataManager.DatabaseFile<MZ.Animation>
  var $dataTilesets: DataManager.DatabaseFile<MZ.Tileset>
  var $dataCommonEvents: DataManager.DatabaseFile<MZ.CommonEvent>
  var $dataSystem: MZ.System
  var $dataMapInfos: DataManager.DatabaseFile<MZ.MapInfo>
  var $dataMap: MZ.Map

  var $gameTemp: Game_Temp
  var $gameSystem: Game_System
  var $gameScreen: Game_Screen
  var $gameTimer: Game_Timer
  var $gameMessage: Game_Message
  var $gameSwitches: Game_Switches
  var $gameVariables: Game_Variables
  var $gameSelfSwitches: Game_SelfSwitches
  var $gameActors: Game_Actors
  var $gameParty: Game_Party
  var $gameTroop: Game_Troop
  var $gameMap: Game_Map
  var $gamePlayer: Game_Player

  var $testEvent: MZ.EventCommon.PageCommand[]

  var $plugins: PluginManager.PluginConfig[]
}

export { }
