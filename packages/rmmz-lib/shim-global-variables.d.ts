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
  Game_Variables
} from './src'
import type { DataActor, DataItem, DataSystem, DataMap } from './src'

declare global {
  declare var $dataActors: DataActor[]
  declare var $dataClasses: unknown[]
  declare var $dataSkills: DataItem[]
  declare var $dataItems: DataItem[]
  declare var $dataWeapons: DataItem[]
  declare var $dataArmors: DataItem[]
  declare var $dataEnemies: unknown
  declare var $dataTroops: unknown
  declare var $dataStates: unknown
  declare var $dataAnimations: unknown
  declare var $dataTilesets: unknown
  declare var $dataCommonEvents: unknown
  declare var $dataSystem: DataSystem
  declare var $dataMapInfos: unknown
  declare var $dataMap: DataMap

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
