import type { SceneManager } from '../managers/SceneManager'
import { Scene_Battle } from './Scene_Battle'
import { Scene_Boot } from './Scene_Boot'
import { Scene_Debug } from './Scene_Debug'
import { Scene_Equip } from './Scene_Equip'
import { Scene_GameEnd } from './Scene_GameEnd'
import { Scene_Gameover } from './Scene_Gameover'
import { Scene_Item } from './Scene_Item'
import { Scene_Load } from './Scene_Load'
import { Scene_Map } from './Scene_Map'
import { Scene_Menu } from './Scene_Menu'
import { Scene_Name } from './Scene_Name'
import { Scene_Options } from './Scene_Options'
import { Scene_Save } from './Scene_Save'
import { Scene_Shop } from './Scene_Shop'
import { Scene_Skill } from './Scene_Skill'
import { Scene_Splash } from './Scene_Splash'
import { Scene_Status } from './Scene_Status'
import { Scene_Title } from './Scene_Title'

/**
 * The built-in scenes: name -> constructor.
 *
 * Every scene a transition can target is registered exactly once, here. The
 * names are the class names without the `Scene_` prefix, and `SceneName` is
 * derived from this table, so adding a scene only means adding a line below.
 *
 * The host hands the table to {@link SceneManager.run}, which keeps the import
 * of `scenes/index.ts` free of registration side effects.
 */
export const builtInScenes = {
  Battle: Scene_Battle,
  Boot: Scene_Boot,
  Debug: Scene_Debug,
  Equip: Scene_Equip,
  GameEnd: Scene_GameEnd,
  Gameover: Scene_Gameover,
  Item: Scene_Item,
  Load: Scene_Load,
  Map: Scene_Map,
  Menu: Scene_Menu,
  Name: Scene_Name,
  Options: Scene_Options,
  Save: Scene_Save,
  Shop: Scene_Shop,
  Skill: Scene_Skill,
  Splash: Scene_Splash,
  Status: Scene_Status,
  Title: Scene_Title,
} satisfies Record<string, SceneManager.SceneConstructor>

export type SceneName = keyof typeof builtInScenes
