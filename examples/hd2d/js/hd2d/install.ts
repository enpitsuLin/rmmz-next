import { installPluginCommands } from './patches/PluginCommands'
import { installSceneMapPatch } from './patches/Scene_Map'
import '@pixi/3d'

export function installHd2d(): void {
  installSceneMapPatch()
  installPluginCommands()
}
