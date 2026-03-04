import type {
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
} from './src'
import type { DataManager } from './src/managers/DataManager'
import type { MZ } from '@rmmz-lib/database-types'


declare global {
  declare var $dataActors: DataManager.DatabaseFile<MZ.Actor>
  declare var $dataClasses: DataManager.DatabaseFile<MZ.Class>
  declare var $dataSkills: DataManager.DatabaseFile<MZ.Skill>
  declare var $dataItems: DataManager.DatabaseFile<MZ.Item>
  declare var $dataWeapons: DataManager.DatabaseFile<MZ.Weapon>
  declare var $dataArmors: DataManager.DatabaseFile<MZ.Armor>
  declare var $dataEnemies: DataManager.DatabaseFile<MZ.Enemy>
  declare var $dataTroops: DataManager.DatabaseFile<MZ.Troop>
  declare var $dataStates: DataManager.DatabaseFile<MZ.State>
  declare var $dataAnimations: DataManager.DatabaseFile<MZ.Animation>
  declare var $dataTilesets: DataManager.DatabaseFile<MZ.Tileset>
  declare var $dataCommonEvents: DataManager.DatabaseFile<MZ.CommonEvent>
  declare var $dataSystem: MZ.System
  declare var $dataMapInfos: DataManager.DatabaseFile<MZ.MapInfo>
  declare var $dataMap: MZ.Map

  declare var $gameTemp: Game_Temp
  declare var $gameSystem: Game_System
  declare var $gameScreen: Game_Screen
  declare var $gameTimer: Game_Timer
  declare var $gameMessage: Game_Message
  declare var $gameSwitches: Game_Switches
  declare var $gameVariables: Game_Variables
  declare var $gameSelfSwitches: Game_SelfSwitches
  declare var $gameActors: Game_Actors
  declare var $gameParty: Game_Party
  declare var $gameTroop: Game_Troop
  declare var $gameMap: Game_Map
  declare var $gamePlayer: Game_Player

  declare var $testEvent: any
}

export { }
