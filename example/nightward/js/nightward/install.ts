import { installAudioManagerPatch } from './patches/AudioManager'
import { installConfigManagerPatch } from './patches/ConfigManager'
import { installDataManagerPatch } from './patches/DataManager'
import { installGameActorPatch } from './patches/Game_Actor'
import { installGameEventPatch } from './patches/Game_Event'
import { installGameTroopPatch } from './patches/Game_Troop'
import { installGraphicsPatch } from './patches/Graphics'
import { installInputPatch } from './patches/Input'
import { installPluginCommands } from './patches/PluginCommands'
import { installSceneManagerPatch } from './patches/SceneManager'
import '@pixi/3d'

export function installNightward(): void {
  installConfigManagerPatch()
  installAudioManagerPatch()
  installGraphicsPatch()
  installInputPatch()
  installDataManagerPatch()
  installGameActorPatch()
  installGameTroopPatch()
  installGameEventPatch()
  installSceneManagerPatch()
  installPluginCommands()
}
