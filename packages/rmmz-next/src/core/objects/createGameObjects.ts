import { GlobalMananger } from '../managers/GlobalManager'
import { Game_Actors } from './Game_Actors'
import { Game_Map } from './Game_Map'
import { Game_Message } from './Game_Message'
import { Game_Party } from './Game_Party'
import { Game_Player } from './Game_Player'
import { Game_Screen } from './Game_Screen'
import { Game_SelfSwitches } from './Game_SelfSwitches'
import { Game_Switches } from './Game_Switches'
import { Game_System } from './Game_System'
import { Game_Temp } from './Game_Temp'
import { Game_Timer } from './Game_Timer'
import { Game_Troop } from './Game_Troop'
import { Game_Variables } from './Game_Variables'

/**
 * Instantiates a fresh set of game objects and assigns them to the global state.
 *
 * Kept out of `DataManager` and `SavefileManager` so neither has to import the
 * object classes itself.
 */
export function createGameObjects(): void {
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
