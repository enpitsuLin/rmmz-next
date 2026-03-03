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

  MZ
} from './src'


declare global {
  declare var $dataActors: MZ.Actor[]
  declare var $dataClasses: unknown[]
  declare var $dataSkills: MZ.Skill[]
  declare var $dataItems: MZ.Item[]
  declare var $dataWeapons: MZ.Weapon[]
  declare var $dataArmors: MZ.Armor[]
  declare var $dataEnemies: MZ.Enemy[]
  declare var $dataTroops: unknown
  declare var $dataStates: MZ.State[]
  declare var $dataAnimations: unknown
  declare var $dataTilesets: MZ.Tileset[]
  declare var $dataCommonEvents: MZ.CommonEvent[]
  declare var $dataSystem: MZ.System
  declare var $dataMapInfos: MZ.MapInfo[]
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
